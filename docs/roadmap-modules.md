# Roadmap — Bulldog Las Vegas (Mission Control)

**Deadline:** 26 de marzo de 2026
**Fase:** Sistema completo — 3 agentes outbound con loop de mejora continua vía OpenClaw

---

## SPEC-01 — Setup del proyecto y base de datos

Next.js con App Router, Drizzle ORM + PostgreSQL con schema completo (users, agents, batches,
contacts, calls, dnc_list, prompt_suggestions), Docker Compose para PostgreSQL en VPS,
migraciones iniciales y seed con los 3 agentes placeholder. Al finalizar, `npm run dev`
levanta el proyecto y la DB tiene todas las tablas listas.

**Back:**
- [x] Inicializar proyecto Next.js 16 con App Router, TypeScript y estructura FSD (`entities/`, `features/`, `widgets/`, `shared/`)
- [x] Configurar Drizzle ORM con driver de PostgreSQL
- [x] Schema: tabla `users` (id, name, email unique, emailVerified, image, password hash, role `super_admin|admin|viewer`, timestamps)
- [x] Schema: tabla `accounts` (userId FK, type, provider, providerAccountId, tokens — PK compuesto provider+providerAccountId)
- [x] Schema: tabla `verificationTokens` (identifier, token, expires — PK compuesto)
- [x] Schema: tabla `agents` (id, retellAgentId unique, name, prompt, promptDraft, voice, language, isActive, timestamps)
- [x] Schema: tabla `batches` (id, userId FK, name, totalContacts, status `draft|running|completed|paused`, startedAt, completedAt, createdAt)
- [x] Schema: tabla `contacts` (id, batchId FK, assignedAgentId FK, firstName, lastName, phone, address, status `pending|called|converted|rejected|dnc|no_answer`, timestamps)
- [x] Schema: tabla `calls` (id, agentId FK, contactId FK, retellCallId unique, customerName, customerPhone, customerAddress, startedAt, endedAt, durationSeconds, result `positive|rejected|dnc|no_answer`, processingStatus `unprocessed|processed`, summary, transcript, audioUrl, cost decimal, createdAt)
- [x] Schema: tabla `dncList` (id, sourceCallId FK unique, phone unique, reason, addedAt)
- [x] Schema: tabla `promptSuggestions` (id, agentId FK, batchId FK, reviewedBy FK, suggestionText, status `pending|accepted|rejected|implemented`, reviewedAt, createdAt)
- [x] Levantar PostgreSQL en VPS con Docker Compose
- [x] Script `npm run db:migrate` para aplicar schema
- [x] Script `npm run db:seed` con 3 agentes placeholder y usuario inicial

**Shared:**
- [x] Tailwind CSS v4 + shadcn/ui como librería de componentes
- [x] Path aliases configurados: `@/*`, `@/entities/*`, `@/features/*`, `@/widgets/*`, `@/shared/*`
- [x] Utilidad `cn()` (clsx + tailwind-merge) en `shared/lib/utils.ts`
- [x] `.env.example` con DATABASE_URL y AUTH_SECRET

---

## SPEC-02 — Agente #1: diseño de identidad y setup en Retell

Diseño completo de la identidad del Agente #1 (nombre, personalidad, tono, approach de venta
para carpet cleaning), adaptación del prompt inbound → outbound, configuración en Retell (voz,
idioma, saludo, prompt), y setup de la tool call que se ejecuta cuando el cliente dice que sí.
Al finalizar, el Agente #1 hace llamadas outbound reales y la tool call envía datos al webhook.

**Retell:**
- [x] Diseñar identidad del Agente #1 (nombre, personalidad, tono, estrategia de venta)
- [x] Adaptar prompt inbound → outbound para carpet cleaning (el agente inicia la conversación, ofrece servicio, maneja objeciones, guía al cierre)
- [x] Configurar agente en Retell (voz, idioma inglés, saludo inicial)
- [x] Configurar tool call de conversión positiva: al cliente decir sí, el agente envía nombre, dirección, teléfono y summary al endpoint de N8N
- [x] Validar con 5-10 llamadas de prueba e iterar prompt hasta que sea consistente

---

## SPEC-03 — Dashboard shell y autenticación

Layout base del dashboard Mission Control: sidebar con navegación (Batches, Llamadas, Agentes,
Sugerencias, Métricas, Settings), Auth.js v5 con credentials provider (email/password), JWT
sessions, rutas protegidas por middleware, roles (super_admin / admin / viewer). Al finalizar,
se puede hacer login, navegar el dashboard, y las rutas están protegidas.

**Back:**
- [x] Configurar Auth.js v5 con Drizzle Adapter y credentials provider (email/password con bcrypt)
- [x] Estrategia JWT — sesiones en cookie HttpOnly, sin tabla sessions en DB
- [x] Session incluye userId y role
- [x] Middleware que protege rutas: `/llamadas/*`, `/batches/*`, `/contactos/*`, `/agentes/*`, `/sugerencias/*`, `/metricas/*`, `/settings/*`
- [x] Redirect: no autenticado → `/login`

**Front:**
- [x] Layout dashboard `(dashboard)/layout.tsx` con Sidebar + Header
- [x] Sidebar con navegación: Llamadas, Batches, Contactos, Agentes, Sugerencias, Métricas, Settings
- [x] Header con nombre del usuario y botón de cerrar sesión
- [x] Página de login `/login` con formulario email + contraseña (localizada en español)
- [x] Redirect post-login a `/llamadas`
- [x] Páginas placeholder para secciones pendientes (Batches, Agentes, Sugerencias, Métricas, Settings)

---

## SPEC-04 — Registro de llamadas e importación de contactos

Webhook que recibe datos post-call de Retell y persiste cada llamada en DB. Segundo webhook
para tool calls (conversiones positivas vía N8N). Importación de CSV/Excel: crea batch en
draft, valida contra DNC, asigna agentes aleatoriamente. Vista de historial de llamadas con
filtros, búsqueda, paginación y drawer de detalle con transcripción y audio. Al finalizar,
cada llamada de Retell se registra automáticamente y se pueden importar listas de contactos.

**Back:**
- [x] Endpoint POST `/api/webhook/retell` — recibe payload post-call de Retell, mapea a schema DB, upsert en calls (por retellCallId o phone), actualiza status del contacto, agrega a DNC si result es `dnc`. Registra `processingStatus = unprocessed`
- [x] Endpoint POST `/api/webhook/retell-tool` — recibe payload de tool call (conversiones positivas vía N8N), mapea y upsert en calls
- [x] Endpoint GET `/api/calls` — lista llamadas con paginación, filtros (result, agentId, dateRange, search por nombre/teléfono)
- [x] Endpoint GET `/api/calls/[id]` — detalle de llamada con transcript, audioUrl, summary, nombre del agente
- [x] Endpoint GET `/api/contacts` — lista contactos con paginación, filtros (status, agentId, batchId, search)
- [x] Endpoint POST `/api/contacts/import` — recibe FormData con archivo CSV/XLSX, parsea con PapaParse/XLSX, crea batch en draft con nombre del archivo, valida contra DNC, asigna agentes aleatoriamente, bulk insert, retorna resumen con agentBreakdown
- [x] `CallsRepository`: `upsert()`, `getMany()` con filtros, `getById()` con join a agents
- [x] `ContactsRepository`: `bulkInsert()`, `getMany()` con filtros, `updateStatus()`, `getPhoneSet()`, `findByPhone()`
- [x] `AgentsRepository`: `getActive()`, `getByRetellId()`, `getAll()`
- [x] `BatchesRepository`: `create()`, `updateTotalContacts()`, `getAll()`
- [x] `DncRepository`: `getPhoneSet()`, `insert()`
- [x] `parseContactsFile()` — parser de CSV/XLSX con auto-detección de columnas (phone/teléfono, firstName/nombre, etc.)
- [x] `mapPostCallToDb()` y `mapToolCallToDb()` — mappers de payload Retell a schema DB

**Front:**
- [x] Página `/llamadas` — server component que carga agentes para filtros
- [x] Widget `CallFilters` — filtros por resultado, agente, rango de fechas, búsqueda por texto
- [x] Widget `CallsTable` — tabla paginada con columnas: cliente, teléfono, agente, fecha, duración, resultado (badge con color)
- [x] Widget `CallDetailSheet` — drawer lateral con detalle completo: transcripción, audio player, summary, costo, datos del cliente
- [x] Página `/contactos` — server component que carga agentes y batches para filtros
- [x] Widget `ContactFilters` — filtros por agente, batch, status
- [x] Widget `ContactsTable` — tabla paginada con columnas: nombre, teléfono, agente asignado, batch, status (badge)
- [x] Widget `ImportDialog` — diálogo para subir CSV/XLSX, muestra resumen post-carga con agentBreakdown y link a `/batches`

---

## SPEC-05 — Vista y gestión de batches

Página `/batches` con lista de todos los batches y detalle individual. Al importar un CSV ya se
crea un batch en `draft`, pero no hay donde verlo ni gestionarlo. Al finalizar, el usuario puede
ver todos sus batches, entrar al detalle de cada uno, y ver los contactos agrupados por agente
con su status.

**Back:**
- [ ] Endpoint GET `/api/batches` — lista batches con paginación, ordenados por `createdAt` desc. Incluir: id, name, status, totalContacts, createdAt, startedAt, completedAt
- [ ] Endpoint GET `/api/batches/[id]` — detalle de un batch: datos del batch + contactos agrupados por agente con conteo por status (pending, called, converted, rejected, dnc, no_answer)
- [ ] Agregar a `BatchesRepository`: `getById(batchId)`, `getByIdWithContacts(batchId)` con join a contacts y agents
- [ ] Agregar a `ContactsRepository`: `getByBatchGroupedByAgent(batchId)` — contactos del batch agrupados por assignedAgentId con conteo por status

**Front:**
- [ ] Página `/batches` — tabla con columnas: Nombre, Status (badge con color), Total contactos, Fecha creación
- [ ] Badge de status: 🟡 draft, 🔵 running, 🟢 completed, ⚪ paused
- [ ] Click en fila → navega a `/batches/[id]`
- [ ] Página `/batches/[id]` — detalle del batch: nombre, status, fecha creación, total contactos
- [ ] Sección de contactos agrupados por agente: nombre del agente → tabla de contactos (nombre, teléfono, status badge)
- [ ] Resumen visual por agente: X pending, Y called, Z converted (contadores)
- [ ] Botón "← Volver a batches" en la vista de detalle
- [ ] Estado vacío en lista: "No hay batches — importa un CSV desde Contactos"

---

## SPEC-06 — Dispatch de llamadas y configuración

Botón "Iniciar batch" que arranca el drip dispatcher: lanza 1 llamada por agente cada X tiempo
según el intervalo configurado en Settings. El dispatcher corre como workflow en N8N. También
incluye el panel de Settings con intervalo, horarios permitidos y pausa/reanudación de batches.
Al finalizar, se puede activar un batch draft, pausarlo en medio, reanudarlo, y las llamadas
se disparan respetando intervalos y horarios.

**Back:**
- [ ] Schema: tabla `settings` (id, key text unique, value text, updatedAt) — configuración global
- [ ] Seed de settings iniciales: `call_interval = "60"` (minutos), `schedule_morning = "08:00-10:00"`, `schedule_afternoon = "15:00-17:00"`, `timezone = "America/Los_Angeles"`
- [ ] Endpoint GET `/api/settings` — retorna settings actuales (intervalo, horarios)
- [ ] Endpoint PUT `/api/settings` — actualiza settings (solo `super_admin` y `admin`)
- [ ] Endpoint POST `/api/batches/[id]/start` — valida batch en `draft`, cambia a `running`, registra `startedAt`, dispara webhook a N8N para iniciar el drip loop
- [ ] Endpoint POST `/api/batches/[id]/pause` — valida batch en `running`, cambia a `paused`, notifica a N8N para detener el loop
- [ ] Endpoint POST `/api/batches/[id]/resume` — valida batch en `paused`, cambia a `running`, dispara webhook a N8N para retomar loop
- [ ] Endpoint POST `/api/batches/[id]/complete` — cambia status a `completed`, registra `completedAt` (llamado por N8N al terminar todos los pending)
- [ ] Agregar a `BatchesRepository`: `updateStatus(batchId, status)`, `setStartedAt(batchId)`, `setCompletedAt(batchId)`

**N8N:**
- [ ] Workflow "Drip Dispatcher": recibe webhook con batchId → loop por contactos `pending` → por cada ciclo lanza 1 llamada por agente vía Retell API → espera intervalo (leído de DB en cada ciclo para permitir cambio en caliente) → repite
- [ ] Lógica de horarios: si el siguiente intervalo cae fuera de franja permitida, calcular delta hasta inicio del siguiente bloque válido y esperar
- [ ] Al terminar todos los contactos pending → POST a `/api/batches/[id]/complete`
- [ ] Soporte para pausa: al recibir señal de pausa, el loop se detiene después de la llamada activa
- [ ] Soporte para reanudación: retoma el loop desde el siguiente contacto `pending`

**Front:**
- [ ] En `/batches/[id]`: botón "Iniciar batch" visible solo si status es `draft` → modal de confirmación: "Se van a realizar X llamadas con intervalo de Y minutos. ¿Continuar?"
- [ ] Botón "Pausar" visible solo si status es `running`
- [ ] Botón "Reanudar" visible solo si status es `paused`
- [ ] Indicador de progreso: llamadas realizadas / total (polling cada 30s o refresh manual)
- [ ] Página `/settings` — sección "Configuración de llamadas" (solo `super_admin` / `admin`)
- [ ] Selector de intervalo: 30 min / 1 hora / 2 horas
- [ ] Campos de horarios permitidos: franja mañana (HH:MM - HH:MM) y franja tarde (HH:MM - HH:MM)
- [ ] Timezone fija mostrada: America/Los_Angeles (Pacific Time)
- [ ] Campo de presupuesto Retell — visible pero deshabilitado ("Sin límite — configurable en futuro")
- [ ] Botón "Guardar cambios" → PUT `/api/settings` → toast de confirmación

---

## SPEC-07 — Pipeline de OpenClaw y análisis automático (Cron 1)

Workflow en N8N que conecta las llamadas con OpenClaw para análisis automático. Cron 1 corre
cada noche a las 12AM, busca llamadas `unprocessed` por agente, las envía a OpenClaw, y
persiste sugerencias de mejora en la DB. Al finalizar, cada mañana hay sugerencias nuevas
pendientes de revisión para cada agente que hizo llamadas el día anterior.

**Back:**
- [ ] Agregar a `CallsRepository`: `getUnprocessedByAgent(agentId)` — llamadas con `processingStatus = 'unprocessed'` de un agente
- [ ] Agregar a `CallsRepository`: `markAsProcessed(callIds: string[])` — actualiza `processingStatus` a `'processed'`
- [ ] Endpoint POST `/api/calls/mark-processed` — recibe `{ callIds: string[] }`, marca como processed (usado por N8N)
- [ ] Endpoint POST `/api/suggestions` — recibe `{ agentId, batchId, suggestionText }`, crea prompt_suggestion con status `pending`
- [ ] Endpoint GET `/api/suggestions` — lista sugerencias con filtros por status y agentId, incluir nombre del agente via join

**N8N:**
- [ ] Configurar cuenta/instancia de OpenClaw y credenciales de API
- [ ] Workflow "Cron 1 — Análisis": cron 12AM → GET agentes activos → por cada agente: GET llamadas unprocessed → si hay, enviar transcripciones a OpenClaw con contexto del agente (nombre, prompt actual, identidad)
- [ ] Definir criterios de evaluación en OpenClaw: éxito = tool call positiva disparada, secundarios = manejo de objeciones, naturalidad, consistencia con identidad
- [ ] OpenClaw retorna sugerencias concretas y accionables → POST `/api/suggestions` por cada sugerencia
- [ ] POST `/api/calls/mark-processed` con los IDs de las llamadas analizadas
- [ ] Manejo de errores: si OpenClaw falla, retry 3 veces con backoff, logging, no marcar llamadas como processed

---

## SPEC-08 — Interfaz HITL y aplicación de mejoras al prompt (Cron 2)

Sección `/sugerencias` donde el usuario revisa, aprueba o rechaza sugerencias de OpenClaw.
Al aprobar, el Cron 2 en N8N toma las sugerencias `accepted`, las aplica al prompt del agente,
y actualiza Retell vía API. Al finalizar, el loop de mejora continua está cerrado: las sugerencias
aprobadas se convierten en cambios reales al prompt del agente en Retell.

**Back:**
- [ ] Endpoint PUT `/api/suggestions/[id]/approve` — cambia status a `accepted`, registra `reviewedBy` y `reviewedAt`
- [ ] Endpoint PUT `/api/suggestions/[id]/reject` — cambia status a `rejected`, registra `reviewedBy` y `reviewedAt`
- [ ] Agregar a `AgentsRepository`: `updatePrompt(agentId, newPrompt)` — actualiza campo `prompt` en DB
- [ ] Agregar a `AgentsRepository`: `updatePromptDraft(agentId, draft)` — actualiza campo `promptDraft`
- [ ] Endpoint GET `/api/agents` — lista agentes con prompt actual (para referencia en HITL)
- [ ] Endpoint GET `/api/agents/[id]` — detalle de agente con prompt, promptDraft, y conteo de sugerencias por status

**N8N:**
- [ ] Workflow "Cron 2 — Mejora de Prompts": cron periódico → busca sugerencias con status `accepted` → agrupa por agente
- [ ] Por cada agente: GET prompt actual → LLM genera nuevo prompt incorporando sugerencias → guardar en `promptDraft`
- [ ] Actualizar prompt en Retell vía API (`PATCH /agents/{retellAgentId}`)
- [ ] Si OK: marcar sugerencias como `implemented`, actualizar campo `prompt` en DB
- [ ] Si falla: retry 3 veces, logging, no marcar como implemented

**Front:**
- [ ] Página `/sugerencias` — tabs o filtro por status: Pendientes / Aprobadas / Rechazadas / Implementadas
- [ ] Vista default: sugerencias `pending` agrupadas por agente
- [ ] Card por sugerencia: texto de la sugerencia, nombre del agente, fecha de creación, badge de status
- [ ] Botón "Aprobar" (verde) → PUT approve → toast "Sugerencia aprobada — se aplicará en el próximo ciclo"
- [ ] Botón "Rechazar" (rojo) → PUT reject → toast "Sugerencia rechazada"
- [ ] Expandible: ver llamadas que originaron la sugerencia (por batchId + agentId) con link a transcripción
- [ ] Panel lateral: prompt actual del agente como referencia al revisar
- [ ] Contador de sugerencias pendientes en el sidebar (badge numérico junto a "Sugerencias")

---

## SPEC-09 — Agentes #2 y #3, métricas y leads calientes

Escalar de 1 a 3 agentes con identidades distintas en Retell. Dashboard de métricas por agente
y globales. Notificaciones de leads calientes cuando un cliente dice que sí. Al finalizar, los
3 agentes están activos, hay visibilidad sobre el rendimiento de cada uno, y el equipo sabe
al instante cuando hay un lead nuevo.

**Retell:**
- [ ] Diseñar identidad Agente #2: nombre, personalidad, tono, approach de venta distinto al #1 — documentar en Obsidian
- [ ] Diseñar identidad Agente #3: nombre, personalidad, tono, approach distinto al #1 y #2 — documentar en Obsidian
- [ ] Configurar Agente #2 en Retell: prompt, voz diferente, saludo inicial, tool call de conversión
- [ ] Configurar Agente #3 en Retell: prompt, voz diferente, saludo inicial, tool call de conversión
- [ ] Actualizar seed de DB con los retellAgentId reales de los 3 agentes
- [ ] Validar con llamadas de prueba que ambos agentes nuevos funcionan correctamente

**Back:**
- [ ] Endpoint GET `/api/metrics` — métricas por agente: total llamadas, conversiones (result=positive), tasa de conversión (%), rechazos, sin respuesta. Métricas globales: totales, mejor agente
- [ ] Endpoint GET `/api/metrics?batchId=X` — mismas métricas filtradas por batch
- [ ] Endpoint GET `/api/leads` — llamadas con result `positive` ordenadas por fecha desc, con nombre, teléfono, agente, timestamp

**Front:**
- [ ] Página `/agentes` — lista de agentes: nombre, voz, idioma, activo/inactivo, total llamadas, tasa de conversión
- [ ] Click en agente → detalle con prompt actual, promptDraft, historial de sugerencias implementadas
- [ ] Página `/metricas` — cards por agente: total llamadas, conversiones, tasa %, rechazos
- [ ] Tabla comparativa de agentes: nombre, llamadas, conversiones, tasa — ordenable
- [ ] Filtro por batch para métricas de un batch específico
- [ ] Métrica global destacada: "Mejor agente: [nombre] con X% de conversión"
- [ ] Sección "Leads recientes": nombre, teléfono, agente, timestamp — últimos 10 leads
- [ ] Badge en sidebar junto a "Métricas": número de leads calientes últimas 24h (polling cada 60s)

---

## SPEC-10 — Prueba end-to-end y entrega al cliente

Testing completo del ciclo cerrado de mejora continua. Validación de que todo el flujo funciona
sin intervención manual. Al finalizar, el cliente tiene acceso al dashboard, documentación
para operar, y el sistema está en producción.

**Testing:**
- [ ] Test E2E: importar CSV → batch en draft → iniciar → dispatcher lanza llamadas → webhook registra resultados
- [ ] Test E2E: Cron 1 procesa llamadas unprocessed → sugerencias aparecen en `/sugerencias` con status pending
- [ ] Test E2E: aprobar sugerencia → Cron 2 aplica cambio → prompt actualizado en Retell → sugerencia marcada implemented
- [ ] Test E2E: contacto en DNC no recibe llamada al iniciar batch
- [ ] Test E2E: pausar batch running → dispatcher se detiene → reanudar → retoma desde siguiente pending
- [ ] Test: métricas reflejan correctamente resultados por agente
- [ ] Validar error handling: webhook con payload incompleto, OpenClaw timeout, Retell API caída
- [ ] Validar logging en producción: errores se registran para debugging

**Entrega:**
- [ ] Crear cuenta `admin` para el cliente en el dashboard
- [ ] Documentar instrucciones: importar contactos, iniciar batch, revisar sugerencias, interpretar métricas
- [ ] Sesión de onboarding con el cliente: demo del flujo completo + Q&A
- [ ] Verificar que el cliente opera el sistema sin asistencia técnica

---

## Fuera del Scope (Post-deadline)

- Límites de llamadas por día/semana
- Dashboard de métricas avanzado (gráficas, tendencias)
- Múltiples clientes / multi-tenancy
- Importar números de Twilio
- Integraciones con CRMs
- Modo oscuro
- Notificaciones por email/SMS
- Edición de agentes desde la UI (crear/eliminar)
- Exportación de datos a CSV/Excel
- Presupuesto activo de Retell (cortar llamadas al llegar al límite)
- Recuperación de contraseña
- OAuth / SSO
