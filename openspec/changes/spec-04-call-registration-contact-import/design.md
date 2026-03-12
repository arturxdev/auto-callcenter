## Context

Proyecto greenfield — SPEC-03 dejó el dashboard con shell funcional (auth, sidebar, header) y schema completo de 9 tablas migradas en PostgreSQL via Drizzle ORM. Las páginas `/llamadas` y `/contactos` son placeholders vacíos. Este es el primer SPEC que introduce lógica de negocio real.

El sistema es single-tenant para Bulldog Las Vegas — 3 agentes AI outbound en Retell para carpet cleaning. Hay dos fuentes de datos: (1) Retell envía metadata post-call al terminar una llamada, (2) N8N envía el resultado de la tool del agente cuando el cliente acepta — con datos como nombre, dirección, fecha, bloque. Son dos webhooks separados.

**Stack actual:** Next.js 16 App Router + Drizzle ORM + Auth.js v5 + Tailwind v4 + shadcn/ui (new-york, estética Linear)

**Arquitectura:** Feature-Sliced Design (FSD) — `src/shared/`, `src/features/`, `src/widgets/`, `src/entities/`, `src/app/`

## Goals / Non-Goals

**Goals:**
- Webhook endpoint que persiste llamadas de Retell en DB y actualiza estado de contactos
- Importación de CSV/Excel con validación DNC y asignación de agentes
- Vista funcional de historial de llamadas con filtros, búsqueda y detalle en sheet lateral
- Vista funcional de contactos con importación y tabla filtrable

**Non-Goals:**
- Dispatch de llamadas (SPEC-05)
- Gestión manual de DNC desde UI (solo alimentación automática por ahora)
- Edición de contactos individuales
- Audio streaming o player sofisticado (se usa `<audio>` nativo)
- Gestión de batches como entidad (solo auto-creación al importar)

## Decisions

### Patrón Repository para acceso a DB

**Decisión:** Toda la comunicación con la base de datos pasa por repositorios — uno por modelo de DB. Los repositorios viven en la capa `entities` de FSD: `src/entities/<model>/repository.ts`. Encapsulan todas las queries Drizzle.

**Reglas de uso:**
- **Server Components puros** (páginas, layouts) pueden importar y usar repositorios directamente
- **Client Components** y cualquier interacción desde el cliente DEBEN pasar por API routes (`src/app/api/`) que internamente delegan a los repositorios
- **Webhook endpoints** (API routes externas) también usan repositorios
- **Nunca** se hace `db.select().from(...)` fuera de un repositorio

**Repositorios a crear:**
```
src/entities/
  calls/repository.ts       → upsert, getMany, getById
  contacts/repository.ts    → bulkInsert, getMany, updateStatus
  batches/repository.ts     → create, updateTotalContacts
  agents/repository.ts      → getActive, getByRetellId
  dnc/repository.ts         → getPhoneSet, insert
```

**Motivo:** Capa de abstracción clara entre DB y el resto del código. Facilita testing, reutilización, y evita queries Drizzle esparcidas. Alineado con FSD donde `entities` es la capa de modelos de dominio.

---

### API routes para operaciones desde client components

**Decisión:** Las operaciones que necesitan los client components se exponen como API routes que delegan a repositorios.

**API routes:**
```
GET  /api/calls          → CallsRepository.getMany(filters)
GET  /api/calls/[id]     → CallsRepository.getById(id)
GET  /api/contacts       → ContactsRepository.getMany(filters)
POST /api/contacts/import → parseo + repos
POST /api/webhook/retell       → post-call metadata (sin auth)
POST /api/webhook/retell-tool  → tool-call resultado (sin auth)
```

**Motivo:** Los widgets son client components que necesitan fetch dinámico. API routes permiten cacheo HTTP y son más naturales para operaciones GET.

---

### Dos webhooks separados para Retell

**Decisión:** Dos endpoints separados:
- `POST /api/webhook/retell` — recibe la metadata post-call de Retell al terminar una llamada (transcript, audio, duración, timestamps, etc.)
- `POST /api/webhook/retell-tool` — recibe el resultado de la tool del agente cuando el cliente acepta la oferta. Viene de N8N con el payload: `{ name, address, phone, date, block, time, transcription }`

**Motivo:** Son dos flujos distintos con payloads diferentes. El post-call viene directo de Retell con metadata de la llamada. La tool viene de N8N con datos estructurados del resultado de conversión. Separarlos hace el código más claro y evita discriminar por tipo de evento en un solo handler.

**Payload de la tool (desde N8N):**
```json
{
  "name": "string",
  "address": "string",
  "phone": "string",
  "date": "string",
  "block": "string",
  "time": "string",
  "transcription": "string"
}
```

**Correlación entre webhooks:** Ambos se relacionan por `phone` (teléfono del cliente). El post-call llega con el retellCallId y metadata técnica; la tool llega con los datos de negocio del resultado positivo.

---

### Filtros via URL searchParams (no estado cliente)

**Decisión:** Todos los filtros y paginación se manejan via URL searchParams. Los componentes de filtro hacen `router.push()` al cambiar, y el client component hace fetch a la API con esos params.

**Motivo:** URL-driven state permite: (1) compartir/guardar URLs con filtros aplicados, (2) back/forward del navegador funciona.

---

### Sheet lateral para detalle de llamada

**Decisión:** El detalle de una llamada se muestra en un shadcn Sheet (panel lateral derecho) en lugar de una página dedicada `/llamadas/[id]`.

**Motivo:** Estilo Linear — el usuario puede escanear la tabla y ver detalles sin perder contexto. Las transcripciones se muestran en un ScrollArea dentro del sheet.

---

### Batch auto-generado al importar

**Decisión:** Al importar un CSV/Excel se crea automáticamente un batch con nombre `"Import YYYY-MM-DD HH:mm"`. No hay paso previo de crear batch.

**Motivo:** Reduce fricción para el MVP — el usuario sube el archivo y todo se configura. SPEC-05 agregará gestión explícita de batches si se necesita.

---

### papaparse + xlsx para parsing de archivos

**Decisión:** `papaparse` para CSV y `xlsx` (SheetJS) para Excel. Parsing en memoria en el servidor.

**Motivo:** Ambas son las librerías más establecidas para sus formatos. Para el volumen esperado (miles de filas, no millones), el parsing en memoria es suficiente. `xlsx` lee tanto `.xlsx` como `.xls`.

---

### Round-robin para asignación de agentes

**Decisión:** Los contactos se asignan a agentes activos usando round-robin (no random puro).

**Motivo:** Distribución equitativa garantizada (~33% cada agente), que es lo que necesita OpenClaw para comparar rendimiento entre agentes de forma justa.

## Risks / Trade-offs

- **Retell payload format puede cambiar** → Tipar estrictamente y validar campos críticos. Log del payload raw para debugging.
- **Correlación entre webhooks** → Post-call y tool-call se correlacionan por teléfono del cliente. Si la tool llega primero y no hay call aún, se crea el registro parcial. El post-call lo completa después (o viceversa).
- **Archivos grandes en importación** → Para MVP el parsing en memoria es suficiente. Configurar `bodySizeLimit: '10mb'` en Server Actions. Si se necesita más, migrar a streaming.
- **Webhooks sin auth** → Por ahora abiertos. Agregar verificación cuando se defina el mecanismo.
- **Componentes shadcn no instalados** → Instalar todos de una vez al inicio para evitar conflictos incrementales.

## Open Questions

~~¿Cuál es el mecanismo exacto de autenticación del webhook de Retell?~~
**Resuelto:** Por ahora no tendrá autenticación. El endpoint será abierto. Se puede agregar verificación de firma más adelante.
