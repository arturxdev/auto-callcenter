# Diagnóstico: auto-callcenter
**Fecha**: 2026-04-06
**Stack**: Next.js 16 (App Router), React 19, TypeScript strict, NextAuth v5 beta con Credentials, Drizzle ORM + PostgreSQL, Tailwind CSS 4, Radix UI/shadcn, Prisma presente pero no usado en runtime

## Resumen Ejecutivo
El proyecto tiene una base funcional pequeña pero todavía está en estado de MVP técnico, no en estado de producción endurecida. Las tres áreas más críticas hoy son seguridad de webhooks/autorización, consistencia de base de datos/migraciones y ausencia total de tests. También hay drift arquitectónico fuerte: conviven Drizzle, Prisma y migraciones manuales, y varias reglas de calidad ya fallan en lint aunque `tsc` pase.

Lo primero que atacaría es: 1) autenticar/firmar los webhooks y agregar autorización real por rol, 2) unificar la estrategia de schema/migrations/ORM, 3) cubrir importación y webhooks con tests de integración. Mientras eso no se resuelva, el proyecto puede “funcionar”, pero sigue siendo frágil ante cambios, datos inconsistentes y abuso externo.

## Scorecard

| Área | Estado | Severidad |
|------|--------|-----------|
| Estructura | Buena intención de FSD (`app/entities/widgets/shared`), pero sin capa de servicios y con patrones mezclados | 🟡 |
| Errores | Manejo básico e inconsistente; respuestas heterogéneas y mensajes internos expuestos | 🟡 |
| Logging | Solo `console.*`, sin request IDs, health check ni monitoreo | 🟡 |
| Testing | No existen tests ni runner configurado | 🔴 |
| Seguridad | Webhooks sin verificación, sin RBAC real, sin rate limiting, sin security headers | 🔴 |
| Base de datos | ORM/migrations inconsistentes, schema duplicado y sin transacciones en flujos críticos | 🔴 |
| Frontend | Estructura razonable pero fetching manual, lint roto y varias pantallas placeholder | 🟡 |
| DevOps | Sin CI/CD, sin `.env.example`, validación parcial de envs | 🟡 |
| TypeScript | `strict` activo y sin `any` reales, pero con drift entre tipos y validación runtime | 🟡 |
| Code smells | Duplicación moderada, dependencia global, placeholders y lógica repetida en widgets | 🟡 |

## Detalle por Área

### 1. Estructura
**Estado actual**
- La estructura intenta seguir un enfoque feature/layered con `src/app`, `src/entities`, `src/widgets`, `src/shared`.
- Los route handlers sí usan repositorios en varios casos (`src/app/api/contacts/route.ts:1-23`, `src/app/api/calls/route.ts:1-24`, `src/app/api/webhook/retell/route.ts:1-67`), así que no están pegándole directo a SQL desde el handler.
- No existe una capa de servicios/casos de uso; la lógica de negocio queda repartida entre handlers y repositorios. El mejor ejemplo es la importación en `src/app/api/contacts/import/route.ts:15-117`, que parsea, valida, crea batch, asigna agentes, deduplica y persiste todo en un solo handler.
- No hay “god objects” >200 líneas dentro de `src/`; el archivo más grande es `src/entities/calls/repository.ts` con 192 líneas. Los más cercanos al límite son `src/shared/ui/select.tsx` (190), `src/widgets/calls/calls-table.tsx` (158), `src/shared/lib/db/schema.ts` (157) y `src/widgets/calls/call-detail-sheet.tsx` (153).
- Hay inconsistencia fuerte a nivel de stack de datos: runtime con Drizzle (`src/shared/lib/db/index.ts:1-19`), schema duplicado en Prisma (`prisma/schema.prisma:1-225`) y además una migración manual custom (`src/shared/lib/db/migrate.ts:1-61`).

**Problemas detectados**
- Falta capa de aplicación/servicios para encapsular casos de uso complejos.
- El patrón no es totalmente consistente: unas responsabilidades viven en repositorios, otras en handlers, y además existe un segundo schema en Prisma que no gobierna el runtime.
- Hay drift documental/técnico: `README.md:1-33` sigue siendo el default de Create Next App y no describe la arquitectura real.

**Severidad**
- 🟡 Importante

**Archivos clave**
- `src/app/api/contacts/import/route.ts:15-117`
- `src/entities/calls/repository.ts:32-192`
- `src/shared/lib/db/index.ts:1-19`
- `prisma/schema.prisma:1-225`
- `src/shared/lib/db/migrate.ts:1-61`

### 2. Manejo de errores
**Estado actual**
- No hay custom error classes; no aparece ningún `extends Error` y se usa `throw new Error(...)` en utilidades como `src/shared/lib/parse-contacts.ts:44` y `src/shared/lib/parse-contacts.ts:95`.
- No existe un error handler centralizado para API routes.
- La estructura de error es inconsistente: `{"error":"Unauthorized"}` en `src/app/api/contacts/route.ts:7-9`, `{"error":"Not found"}` en `src/app/api/calls/[id]/route.ts:16-18`, `{"ok":true,"callId":...}` en webhooks (`src/app/api/webhook/retell/route.ts:59`), y la ruta de detalle devuelve el objeto raw de llamada, no un envelope (`src/app/api/calls/[id]/route.ts:20`).
- Hay `try/catch` sueltos en handlers y scripts: `src/app/api/contacts/import/route.ts:15-117`, `src/app/api/webhook/retell/route.ts:8-67`, `src/app/api/webhook/retell-tool/route.ts:7-49`, `src/shared/lib/db/migrate.ts:45-50`, `src/widgets/contacts/import-dialog.tsx:50-64`.

**Problemas detectados**
- El catch de `src/shared/lib/db/migrate.ts:46-50` traga errores silenciosamente para cualquier excepción al crear foreign keys; asume que todo error significa “ya existe”, lo cual puede ocultar corrupción o drift real.
- `src/widgets/contacts/import-dialog.tsx:62-63` descarta el error y responde con un genérico `"Error de conexión"`, lo que dificulta observabilidad del lado cliente.
- `src/app/api/contacts/import/route.ts:115-116` devuelve `error.message` al cliente; no expone stack trace, pero sí detalles internos de parsing/infra.
- No hay distinción formal entre errores operacionales y bugs; todo termina como `500` o como strings sueltos.

**Severidad**
- 🟡 Importante

**Archivos clave**
- `src/shared/lib/parse-contacts.ts:44`
- `src/shared/lib/parse-contacts.ts:95`
- `src/shared/lib/db/migrate.ts:45-50`
- `src/app/api/contacts/import/route.ts:113-116`
- `src/app/api/webhook/retell/route.ts:60-65`

### 3. Logging y observabilidad
**Estado actual**
- No hay framework de logging; solo `console.log`/`console.error` en scripts y handlers (`src/shared/lib/db/seed.ts:13-75`, `src/shared/lib/db/migrate.ts:8-59`, `src/app/api/contacts/import/route.ts:114`, `src/app/api/webhook/retell/route.ts:61`, `src/app/api/webhook/retell-tool/route.ts:43`).
- No hay logs estructurados JSON.
- No existe request ID tracking ni correlation ID.
- No existe endpoint de health check; no hay coincidencias para `health`, `healthz`, `readyz`, `livez`.
- No se detecta configuración de monitoreo, alertas ni tracing.

**Problemas detectados**
- Cuando fallen importaciones o webhooks, no hay forma de correlacionar eventos entre request, DB y proveedor externo.
- El logging actual no sirve bien para producción ni para alerting.
- Sin health check, despliegues y uptime externo quedan ciegos.

**Severidad**
- 🟡 Importante

**Archivos clave**
- `src/app/api/contacts/import/route.ts:113-114`
- `src/app/api/webhook/retell/route.ts:60-61`
- `src/app/api/webhook/retell-tool/route.ts:42-43`
- `src/shared/lib/db/seed.ts:13-75`

### 4. Testing
**Estado actual**
- No hay tests. No se encontraron `*.test.*`, `*.spec.*`, `tests/` ni `__tests__/`.
- No hay script `test` en `package.json:1-37`.
- No hay configuración de Vitest, Jest ni Playwright.
- Cobertura aproximada: 0%.

**Problemas detectados**
- Los flujos más frágiles no tienen ninguna red de seguridad: importación (`src/app/api/contacts/import/route.ts:15-117`), webhook principal (`src/app/api/webhook/retell/route.ts:8-67`) y upsert complejo (`src/entities/calls/repository.ts:33-111`).
- El código no es especialmente testeable por DI: los repositorios dependen del singleton global `db` (`src/shared/lib/db/index.ts:15-19`) y no reciben dependencias inyectables.
- La falta de tests combinada con migraciones manuales y webhooks externos eleva mucho el riesgo de regresión.

**Severidad**
- 🔴 Crítico

**Archivos clave**
- `package.json:1-37`
- `src/shared/lib/db/index.ts:10-19`
- `src/app/api/contacts/import/route.ts:15-117`
- `src/app/api/webhook/retell/route.ts:8-67`

### 5. Seguridad
**Estado actual**
- Autenticación: NextAuth v5 beta con `Credentials` provider y estrategia JWT (`src/shared/lib/auth.ts:10-18`). Eso implica cookie-based session de Auth.js; razonablemente las cookies son seguras por default, pero no hay endurecimiento explícito en el repo.
- Autorización: existe `role` en JWT/session (`src/shared/lib/auth.ts:49-63`), pero no hay checks de rol en rutas ni UI. La búsqueda solo encuentra asignación de `role`, no enforcement.
- Validación de input backend: casi inexistente. Los query params se leen y castean manualmente en `src/app/api/contacts/route.ts:11-19` y `src/app/api/calls/route.ts:11-20`. Los webhooks hacen `request.json()` y castean el payload por TypeScript, sin validación runtime (`src/app/api/webhook/retell/route.ts:9-12`, `src/app/api/webhook/retell-tool/route.ts:8-11`). Solo la importación de archivos tiene una validación artesanal parcial (`src/shared/lib/parse-contacts.ts:31-95`).
- SQL injection: no vi concatenación SQL manual en queries de app; se usa Drizzle y queries parametrizadas. El único `sql.unsafe` está en la migración manual `src/shared/lib/db/migrate.ts:47`, no en paths expuestos al usuario.
- Rate limiting: no existe.
- CORS: no hay configuración explícita; tampoco se detecta wildcard `*`.
- Security headers: `next.config.ts:1-9` no define `headers()`, CSP, HSTS ni similares.
- Secrets: existen `.env` y `.env.local` locales con variables sensibles (`DATABASE_URL`, `AUTH_SECRET`, `SEED_*`), pero no existe `.env.example`. `git ls-files` no muestra esos archivos como tracked, lo cual es mejor, pero el onboarding sigue mal documentado.
- Dependencias: `npm audit` reportó 23 vulnerabilidades (13 high, 10 moderate, 0 critical). Las más relevantes afectan `next@16.1.6`, `prisma@7.4.2` y `xlsx@0.18.5`.

**Problemas detectados**
- 🔴 Webhooks sin autenticación/firma. `src/app/api/webhook/retell/route.ts:8-59` y `src/app/api/webhook/retell-tool/route.ts:7-41` aceptan cualquier POST y mutan DB. Eso es el gap más grave del proyecto.
- 🔴 No hay RBAC real. Cualquier usuario autenticado puede leer contactos y llamadas (`src/app/api/contacts/route.ts:5-22`, `src/app/api/calls/route.ts:5-23`, `src/app/api/calls/[id]/route.ts:5-20`), aunque el sistema ya modela roles.
- 🟡 No hay rate limiting ni protección contra brute force en login ni abuso en endpoints de import/webhooks.
- 🟡 No hay validación runtime fuerte para payloads externos; TypeScript no protege en ejecución.
- 🟡 Faltan security headers y endurecimiento explícito.
- 🔴 Dependencia `xlsx` queda con vulnerabilidades high sin fix automático disponible según `npm audit`; además se usa directamente sobre archivos subidos por usuario en `src/shared/lib/parse-contacts.ts:85-92`.

**Severidad**
- 🔴 Crítico

**Archivos clave**
- `src/shared/lib/auth.ts:10-63`
- `src/app/api/webhook/retell/route.ts:8-59`
- `src/app/api/webhook/retell-tool/route.ts:7-41`
- `src/app/api/contacts/route.ts:5-22`
- `src/app/api/calls/route.ts:5-23`
- `next.config.ts:1-9`
- `src/shared/lib/parse-contacts.ts:85-92`

### 6. Base de datos
**Estado actual**
- Runtime: Drizzle + `postgres` (`src/shared/lib/db/index.ts:1-19`).
- También existe Prisma schema/config (`prisma/schema.prisma:1-225`, `prisma.config.ts:1-17`) aunque no se usa en runtime.
- Hay migración Drizzle versionada (`drizzle/0000_sour_lucky_pierre.sql:1-125`) pero además existe un script manual `db:migrate` que hace `DROP TABLE IF EXISTS users CASCADE` y luego re-crea/ajusta constraints (`src/shared/lib/db/migrate.ts:10-54`).
- Las tablas tienen timestamps en general, pero no todas tienen `updated_at`: por ejemplo `batches` y `calls` no lo tienen en Drizzle (`src/shared/lib/db/schema.ts:76-128`), mientras Prisma modela más metadata e índices.

**Problemas detectados**
- 🔴 Estrategia de schema/migrations inconsistente: Drizzle schema, Prisma schema y migración manual coexistiendo. Eso es drift estructural.
- 🔴 Hay contradicciones entre Prisma y Drizzle. Prisma declara tabla `Session` e índices amplios (`prisma/schema.prisma:90-99`, `142-145`, `162-165`, `191-195`, `221-224`), mientras Drizzle omite `sessions` por JWT (`src/shared/lib/db/schema.ts:47`) y no declara esos índices.
- 🔴 El SQL de migración no crea índices secundarios; solo PK/unique/FKs (`drizzle/0000_sour_lucky_pierre.sql:1-125`). Eso contradice el schema Prisma y deja filtros importantes sin apoyo de índice, por ejemplo `calls.result` usado en `src/entities/calls/repository.ts:118`.
- 🔴 No se usan transacciones en flujos multi-step. Importación crea batch, inserta contactos y luego actualiza totales en tres pasos separados (`src/app/api/contacts/import/route.ts:47-49`, `95-99`). Si algo falla en medio, queda estado parcial. Lo mismo en webhook: upsert de call, update de contacto y alta en DNC ocurren fuera de transacción (`src/app/api/webhook/retell/route.ts:29-56`).
- 🟡 Hay deletes hard by omission; no soft delete modelado.
- 🟡 No es multi-tenant; no aplica `tenant_id`, pero sí implica que el sistema hoy es single-tenant por diseño.
- 🟡 No detecté N+1 clásico de query dentro de loop; esa parte está razonablemente limpia.

**Severidad**
- 🔴 Crítico

**Archivos clave**
- `src/shared/lib/db/index.ts:1-19`
- `src/shared/lib/db/schema.ts:47`
- `src/shared/lib/db/schema.ts:76-128`
- `src/shared/lib/db/migrate.ts:10-54`
- `prisma/schema.prisma:90-99`
- `prisma/schema.prisma:142-145`
- `prisma/schema.prisma:162-165`
- `prisma/schema.prisma:191-195`
- `drizzle/0000_sour_lucky_pierre.sql:1-125`
- `src/app/api/contacts/import/route.ts:47-99`

### 7. Arquitectura frontend
**Estado actual**
- Estructura también sigue la idea `app/widgets/shared`.
- Hay separación parcial entre páginas servidor y widgets cliente: `src/app/(dashboard)/contactos/page.tsx:8-27` y `src/app/(dashboard)/llamadas/page.tsx:6-17` son server components que cargan catálogos iniciales; las tablas/filtros son client components.
- Estado global innecesario: no hay store global. Eso está bien.
- Data fetching moderno: no. Se usa `fetch + useEffect + useState` manual en `src/widgets/contacts/contacts-table.tsx:44-56`, `src/widgets/calls/calls-table.tsx:50-62` y `src/widgets/calls/call-detail-sheet.tsx:54-61`.
- Filtros y paginación sí están en la URL, lo cual es positivo (`src/widgets/contacts/contact-filters.tsx:35-57`, `src/widgets/calls/call-filters.tsx:29-51`, tablas con `page` en search params).
- Se usan Server Components en páginas/layouts, no todo es `"use client"`.
- Componentes >150 líneas: `src/widgets/calls/calls-table.tsx` (158), `src/widgets/calls/call-detail-sheet.tsx` (153). No hay componentes >200.

**Problemas detectados**
- `npm run lint` falla en frontend por hooks mal declarados y `setState` dentro de effect. Hallazgos concretos:
  - `src/widgets/calls/call-detail-sheet.tsx:56`
  - `src/widgets/calls/call-filters.tsx:40`
  - `src/widgets/calls/calls-table.tsx:58`
  - `src/widgets/contacts/contact-filters.tsx:46`
  - `src/widgets/contacts/contacts-table.tsx:52`
- Hay duplicación clara entre `contact-filters` y `call-filters`, y entre ambas tablas.
- Varias pantallas del dashboard están en placeholder: `src/app/(dashboard)/batches/page.tsx:1-8`, `src/app/(dashboard)/agentes/page.tsx:1-8`, `src/app/(dashboard)/metricas/page.tsx:1-8`, `src/app/(dashboard)/settings/page.tsx:1-8`, `src/app/(dashboard)/sugerencias/page.tsx:1-8`.
- El layout raíz todavía tiene branding default (`src/app/layout.tsx:15-18`), señal de producto incompleto.

**Severidad**
- 🟡 Importante

**Archivos clave**
- `src/app/(dashboard)/contactos/page.tsx:8-27`
- `src/app/(dashboard)/llamadas/page.tsx:6-17`
- `src/widgets/contacts/contacts-table.tsx:44-56`
- `src/widgets/calls/calls-table.tsx:50-62`
- `src/widgets/calls/call-detail-sheet.tsx:54-61`
- `src/app/layout.tsx:15-18`

### 8. DevOps y deployment
**Estado actual**
- No hay GitHub Actions ni carpeta `.github/workflows`.
- `package.json:1-37` tiene `lint`, `build` y scripts DB, pero no `test`.
- `npx tsc --noEmit` pasa.
- `npm run lint` falla con 5 errores y 9 warnings.
- No existe `.env.example` ni `.env.local.example`.
- La validación de variables de entorno es parcial: Prisma sí valida `DATABASE_URL` en `prisma.config.ts:4-7`, pero el runtime principal usa `process.env.DATABASE_URL!` en `src/shared/lib/db/index.ts:11` y scripts seed/migrate usan non-null assertions también (`src/shared/lib/db/seed.ts:15-18`, `src/shared/lib/db/migrate.ts:5`).
- No hay evidencia de preview deploys ni de pipeline de despliegue.

**Problemas detectados**
- Sin CI, el repo permite mergear con lint roto.
- Sin `.env.example`, onboarding e infraestructura dependen de conocimiento tribal.
- No hay validación centralizada de configuración al arrancar la app.
- No hay señal de despliegue automático, checks de build ni release discipline.

**Severidad**
- 🟡 Importante

**Archivos clave**
- `package.json:1-37`
- `prisma.config.ts:4-7`
- `src/shared/lib/db/index.ts:10-12`
- `src/shared/lib/db/seed.ts:15-18`
- `src/shared/lib/db/migrate.ts:5`

### 9. Tipos y TypeScript
**Estado actual**
- TypeScript está en `strict: true` (`tsconfig.json:3-24`).
- `tsc` pasa sin errores.
- No encontré uso real de `any` en código TypeScript del proyecto.
- Hay tipado de payloads y props en varias zonas (`src/shared/lib/retell.ts:1-28`, widgets y repositorios).

**Problemas detectados**
- Los tipos de API response no están centralizados ni compartidos entre frontend y backend; cada widget redefine sus propios shapes (`src/widgets/contacts/contacts-table.tsx:16-24`, `src/widgets/calls/calls-table.tsx:17-25`, `src/widgets/calls/call-detail-sheet.tsx:14-30`).
- Gran parte de los tipos “mienten” en runtime porque no hay validación Zod/Joi/Valibot sobre payloads externos.
- `src/shared/lib/auth.ts:53` usa cast manual `(user as { role: string }).role`, señal de tipado no del todo resuelto.
- Hay desalineación entre tipos estáticos de Prisma y schema real usado por la app, porque Prisma no gobierna el runtime.

**Severidad**
- 🟡 Importante

**Archivos clave**
- `tsconfig.json:3-24`
- `src/shared/lib/auth.ts:53`
- `src/shared/lib/retell.ts:1-28`
- `src/widgets/calls/call-detail-sheet.tsx:14-30`
- `prisma/schema.prisma:1-225`

### 10. Code smells
**Estado actual**
- No hay `TODO/FIXME/HACK` en `src/`.
- No vi commented-out code significativo.
- No detecté funciones con más de 5 parámetros en firmas regulares.
- Sí hay duplicación moderada de lógica de filtros, paginación y fetching entre widgets.

**Problemas detectados**
- Duplicación:
  - filtros casi espejados entre `src/widgets/contacts/contact-filters.tsx:29-120` y `src/widgets/calls/call-filters.tsx:23-111`
  - tablas casi espejadas entre `src/widgets/contacts/contacts-table.tsx:35-143` y `src/widgets/calls/calls-table.tsx:39-158`
- Magic strings: estados/resultados dispersos en repositorios, UI y handlers (`pending`, `converted`, `dnc`, `no_answer`, etc.) en `src/shared/lib/db/schema.ts:101-122`, `src/app/api/webhook/retell/route.ts:38-45`, `src/widgets/contacts/contacts-table.tsx:26-33`.
- Dependencia global: singleton `db` en `src/shared/lib/db/index.ts:15-19`.
- Uso de `Math.random()` para asignación de agente en importación (`src/app/api/contacts/import/route.ts:74-75`), pese a que el comentario dice “round-robin” (`:32`). Eso además es inconsistencia semántica.
- Branding/config sin terminar en varias páginas placeholder y metadata default (`src/app/layout.tsx:15-18`).

**Severidad**
- 🟡 Importante

**Archivos clave**
- `src/widgets/contacts/contact-filters.tsx:29-120`
- `src/widgets/calls/call-filters.tsx:23-111`
- `src/widgets/contacts/contacts-table.tsx:35-143`
- `src/widgets/calls/calls-table.tsx:39-158`
- `src/app/api/webhook/retell/route.ts:38-45`
- `src/app/api/contacts/import/route.ts:32-45`
- `src/app/api/contacts/import/route.ts:74-75`

## Top 10 Acciones Prioritarias
1. Proteger `src/app/api/webhook/retell/route.ts` y `src/app/api/webhook/retell-tool/route.ts` con firma/verificación del proveedor o secreto compartido antes de tocar DB.
2. Implementar autorización real por rol en `src/middleware.ts` y en las rutas `src/app/api/contacts/route.ts`, `src/app/api/calls/route.ts` y `src/app/api/calls/[id]/route.ts`.
3. Unificar la estrategia de datos: elegir Drizzle o Prisma como source of truth y eliminar el schema/migration path duplicado (`src/shared/lib/db/schema.ts`, `drizzle/0000_sour_lucky_pierre.sql`, `prisma/schema.prisma`, `src/shared/lib/db/migrate.ts`).
4. Reescribir la importación para usar transacción atómica en `src/app/api/contacts/import/route.ts` y mover esa lógica a una capa de servicio.
5. Agregar tests de integración para importación y webhooks (`src/app/api/contacts/import/route.ts`, `src/app/api/webhook/retell/route.ts`, `src/entities/calls/repository.ts`).
6. Sustituir el parsing/casting manual por validación runtime con schema library en webhooks, auth params e importación (`src/shared/lib/retell.ts`, `src/app/api/*`).
7. Resolver el lint roto de widgets React y convertir esas reglas en gate de CI (`src/widgets/calls/call-detail-sheet.tsx:56`, `src/widgets/calls/call-filters.tsx:40`, `src/widgets/calls/calls-table.tsx:58`, `src/widgets/contacts/contact-filters.tsx:46`, `src/widgets/contacts/contacts-table.tsx:52`).
8. Crear `.env.example` y validación centralizada de env vars al startup en vez de non-null assertions dispersas (`src/shared/lib/db/index.ts:11`, `src/shared/lib/db/seed.ts:15-18`, `src/shared/lib/db/migrate.ts:5`).
9. Introducir logging estructurado con request IDs y un `/api/health` o endpoint equivalente.
10. Reemplazar `xlsx@0.18.5` o encapsular su uso con controles estrictos, porque hoy `npm audit` lo reporta con vulnerabilidades high y además procesa input subido por el usuario (`src/shared/lib/parse-contacts.ts:85-92`).
