# Security Audit: Endpoints
**Fecha**: 2026-04-06
**Proyecto**: auto-callcenter

## Alcance
Se auditó todo endpoint ejecutable encontrado en `src/app/api/**/route.ts`. No se encontraron Server Actions (`"use server"`) en `src/`.

## Política aplicada
- **Roles**:
  - `super_admin`: acceso completo.
  - `admin`: lectura/escritura sobre recursos propios.
  - `viewer`: solo lectura sobre recursos propios.
- **Ownership**:
  - `contacts`: ownership por `contacts.batchId -> batches.userId`.
  - `calls`: ownership por `calls.contactId -> contacts.batchId -> batches.userId`.
  - Las llamadas sin `contactId` o sin batch asociado quedan **ocultas para no `super_admin`** por política conservadora.
- **Webhooks**:
  - No usan sesión de usuario.
  - Quedan protegidos con secreto vía header `x-webhook-secret` o `Authorization: Bearer ...`.
  - Variables esperadas:
    - `RETELL_WEBHOOK_SECRET`
    - `RETELL_TOOL_WEBHOOK_SECRET` (si falta, el tool webhook acepta fallback a `RETELL_WEBHOOK_SECRET`)

## Resumen

| Endpoint | Tipo | AuthN | AuthZ por rol | AuthZ por recurso | Input con Zod | Error expone internos | Estado final |
|---|---|---:|---:|---:|---:|---:|---|
| `GET /api/auth/[...nextauth]` | Auth.js framework route | N/A | N/A | N/A | No directo | No directo en código propio | Aceptable / framework-managed |
| `POST /api/auth/[...nextauth]` | Auth.js framework route | N/A | N/A | N/A | No directo | No directo en código propio | Aceptable / framework-managed |
| `GET /api/contacts` | API route | Sí | Sí | Sí | Sí | No | Corregido |
| `POST /api/contacts/import` | API route | Sí | Sí | N/A (crea recurso propio) | Sí | No | Corregido |
| `GET /api/calls` | API route | Sí | Sí | Sí | Sí | No | Corregido |
| `GET /api/calls/[id]` | API route | Sí | Sí | Sí | Sí | No | Corregido |
| `POST /api/webhook/retell` | Webhook | Sí (secreto) | N/A | N/A | Sí | No | Corregido |
| `POST /api/webhook/retell-tool` | Webhook | Sí (secreto) | N/A | N/A | Sí | No | Corregido |

## Detalle por endpoint

### `GET /api/auth/[...nextauth]`
- **Archivo**: `src/app/api/auth/[...nextauth]/route.ts`
- **AuthN**: manejado por Auth.js.
- **AuthZ por rol / recurso**: no aplica; es una ruta framework-managed de autenticación.
- **Zod**: no se agregó en código propio; el endpoint está delegado al framework.
- **Errores**: no hay manejo manual en el repo para auditar.
- **Estado**: aceptable dentro del alcance actual.

### `POST /api/auth/[...nextauth]`
- **Archivo**: `src/app/api/auth/[...nextauth]/route.ts`
- **AuthN**: manejado por Auth.js.
- **AuthZ por rol / recurso**: no aplica.
- **Zod**: no directo en código propio.
- **Errores**: no hay manejo manual en el repo para auditar.
- **Estado**: aceptable dentro del alcance actual.

### `GET /api/contacts`
- **Archivo**: `src/app/api/contacts/route.ts`
- **Antes**:
  - Solo verificaba sesión.
  - Sin validación runtime.
  - Sin filtrado por ownership.
  - Respuesta de error inconsistente.
- **Ahora**:
  - Requiere sesión con rol `super_admin | admin | viewer`.
  - Valida query params con Zod (`page`, `pageSize`, `batchId`, `status`, `agentId`, `search`).
  - Aplica ownership automáticamente para no `super_admin`.
  - Devuelve errores seguros con envelope consistente.
- **Estado final**: protegido.

### `POST /api/contacts/import`
- **Archivo**: `src/app/api/contacts/import/route.ts`
- **Antes**:
  - Solo verificaba sesión.
  - Sin control de rol.
  - Sin Zod sobre el archivo.
  - Exponía `error.message` en algunos fallos.
- **Ahora**:
  - Requiere sesión con rol `super_admin | admin`.
  - Valida el archivo con Zod (`File`, tamaño, extensión).
  - Crea el batch asociado al usuario autenticado.
  - Convierte errores de parsing del archivo en `400 INVALID_FILE`.
  - Devuelve errores seguros y consistentes.
- **Estado final**: protegido.

### `GET /api/calls`
- **Archivo**: `src/app/api/calls/route.ts`
- **Antes**:
  - Solo verificaba sesión.
  - Sin validación runtime.
  - Sin filtrado por ownership.
- **Ahora**:
  - Requiere sesión con rol `super_admin | admin | viewer`.
  - Valida query params con Zod (`page`, `pageSize`, `result`, `agentId`, `dateFrom`, `dateTo`, `search`).
  - Aplica ownership vía `call -> contact -> batch -> user`.
  - Oculta llamadas huérfanas a cualquier no `super_admin`.
  - Devuelve errores seguros.
- **Estado final**: protegido.

### `GET /api/calls/[id]`
- **Archivo**: `src/app/api/calls/[id]/route.ts`
- **Antes**:
  - Solo verificaba sesión.
  - Sin validación runtime del `id`.
  - Sin control de ownership.
- **Ahora**:
  - Requiere sesión con rol `super_admin | admin | viewer`.
  - Valida `id` con Zod.
  - Aplica ownership a la lectura del recurso.
  - Devuelve `404` seguro sin detalles internos.
- **Estado final**: protegido.

### `POST /api/webhook/retell`
- **Archivo**: `src/app/api/webhook/retell/route.ts`
- **Antes**:
  - Sin autenticación.
  - Sin validación runtime del payload.
  - Podía mutar DB desde cualquier POST externo.
- **Ahora**:
  - Requiere secreto de webhook.
  - Valida payload con Zod.
  - Responde con errores seguros.
  - Mantiene el comportamiento de negocio sin exponer stack ni mensajes internos.
- **Estado final**: protegido.

### `POST /api/webhook/retell-tool`
- **Archivo**: `src/app/api/webhook/retell-tool/route.ts`
- **Antes**:
  - Sin autenticación.
  - Sin validación runtime del payload.
  - Mutación directa de DB desde cualquier POST externo.
- **Ahora**:
  - Requiere secreto de webhook.
  - Valida payload con Zod.
  - Responde con errores seguros.
- **Estado final**: protegido.

## Cambios implementados
- Se agregó una capa compartida para endpoints en `src/shared/lib/http.ts`:
  - `requireSession()`
  - `parseWithSchema()`
  - `assertWebhookSecret()`
  - `handleRouteError()`
  - enums Zod para roles y estados
- Se agregaron schemas Zod para webhooks en `src/shared/lib/retell-schemas.ts`.
- Se aplicó filtrado por ownership en:
  - `src/entities/contacts/repository.ts`
  - `src/entities/calls/repository.ts`
- Se endurecieron estos endpoints:
  - `src/app/api/contacts/route.ts`
  - `src/app/api/contacts/import/route.ts`
  - `src/app/api/calls/route.ts`
  - `src/app/api/calls/[id]/route.ts`
  - `src/app/api/webhook/retell/route.ts`
  - `src/app/api/webhook/retell-tool/route.ts`

## Riesgos remanentes
- `Auth.js` route sigue siendo framework-managed; no se instrumentó Zod manual ahí.
- El proyecto aún no valida variables de entorno al arranque para los secretos de webhook; si faltan, los webhooks fallan en runtime de forma cerrada, no abierta.
- Persisten issues de lint preexistentes en widgets React que no forman parte directa de este hardening.
