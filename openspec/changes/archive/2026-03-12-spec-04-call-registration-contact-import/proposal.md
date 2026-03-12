## Why

SPEC-03 estableció la base técnica: Auth.js, schema Drizzle con 9 tablas migradas, y el shell del dashboard con páginas placeholder. Sin embargo, el dashboard no tiene datos ni funcionalidad real. SPEC-04 es el primer SPEC funcional — habilita la persistencia de llamadas desde Retell y la gestión de contactos, que son prerequisitos para SPEC-05 (Batch Management & Call Dispatch).

Sin esto, no hay forma de: (1) registrar las llamadas que hacen los agentes de Retell, (2) cargar listas de contactos para llamar, ni (3) visualizar resultados.

## What Changes

- **Capa de repositorios** — un repositorio por modelo de DB (`calls`, `contacts`, `batches`, `agents`, `dncList`) en `src/entities/`, encapsulando toda la comunicación con Drizzle/PostgreSQL
- **API routes** para operaciones desde client components, delegando toda lógica de DB a los repositorios
- **Webhook post-call** (`POST /api/webhook/retell`) — endpoint separado que recibe metadata completa al terminar una llamada de Retell y persiste la llamada via repositorio. Payload de Retell post-call:
  ```json
  {
    "call_id": "string",
    "agent_id": "string",
    "call_status": "string",
    "start_timestamp": 1234567890,
    "end_timestamp": 1234567890,
    "transcript": "string",
    "recording_url": "string",
    "to_number": "string",
    "from_number": "string",
    "call_cost": 0.0,
    "call_analysis": { ... }
  }
  ```
- **Webhook tool-call** (`POST /api/webhook/retell-tool`) — endpoint separado que recibe el resultado de la tool del agente desde N8N cuando el cliente acepta. Persiste la conversión, actualiza status de contactos, y alimenta la lista DNC. Payload de la tool:
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
- **Nueva funcionalidad de importación** de contactos via CSV/Excel con validación contra lista DNC, asignación aleatoria de agente, y creación automática de batch — todo a través de repositorios
- **Vista funcional `/llamadas`** que reemplaza el placeholder con tabla de datos reales, filtros (resultado, agente, fecha), búsqueda, y panel lateral (Sheet) con detalle de llamada, transcripción y audio
- **Vista funcional `/contactos`** que reemplaza el placeholder con tabla de contactos, filtros, y dialog de importación de archivos

## Capabilities

### New Capabilities

- `retell-webhook`: Dos endpoints separados — uno para post-call de Retell (metadata completa) y otro para la tool-call del agente (resultado de conversión con name, address, phone, date, block, time, transcription)
- `contact-import`: Importación de CSV/Excel con parsing, validación DNC, asignación de agente round-robin, y creación automática de batch
- `call-history-view`: Vista de historial de llamadas con tabla, filtros, búsqueda, paginación y panel lateral de detalle
- `contacts-view`: Vista de gestión de contactos con tabla, filtros, búsqueda, paginación y dialog de importación

### Modified Capabilities

_(ninguna — no hay capabilities existentes)_

## Impact

- **Entities layer**: Nuevos repositorios en `src/entities/` para calls, contacts, batches, agents, dncList
- **API routes**: Route handlers en `src/app/api/` para webhook de Retell, queries de llamadas, queries de contactos, e importación
- **UI**: Se reemplazan 2 páginas placeholder (`/llamadas`, `/contactos`) con funcionalidad completa
- **Dependencias nuevas**: `papaparse` (CSV parsing), `xlsx` (Excel parsing)
- **Componentes shadcn**: table, badge, sheet, dialog, input, select, scroll-area, separator
- **Config Next.js**: Aumento del body size limit para Server Actions (10mb para importación)
