# Specs — Bulldog Las Vegas

**Deadline:** 26 de marzo de 2026

---

## 🏁 Milestone 1: Base técnica

> El proyecto existe, corre localmente, y la DB está lista.

### SPEC-01 — Project Foundation
Setup completo: Next.js con App Router, Drizzle ORM + PostgreSQL schema completo (users, agents, batches, contacts, calls, dnc_list, prompt_suggestions), Auth.js v5 con Drizzle Adapter, Docker Compose para PostgreSQL en VPS, migraciones iniciales y seed con los 3 agentes configurados como placeholder.

**Tareas principales:**
- [x] Inicializar proyecto Next.js con App Router y estructura de carpetas
- [x] Definir schema completo en Drizzle ORM (`users`, `agents`, `batches`, `contacts`, `calls`, `dnc_list`, `prompt_suggestions`)
- [x] Configurar Auth.js v5 con Drizzle Adapter (credentials provider, JWT sessions)
- [x] Levantar PostgreSQL en VPS con Docker Compose
- [x] Correr migraciones iniciales y seed con los 3 agentes placeholder

---

## 🤖 Milestone 2: Sistema de llamadas funcional

> Se puede cargar una lista, disparar llamadas y ver los resultados.

### SPEC-02 — Agent #1: Identity Design & Retell Setup
Diseño completo de la identidad del Agente #1 (nombre, personalidad, tono, approach de venta), adaptación del prompt inbound → outbound para carpet cleaning, configuración en Retell (voz, idioma, saludo, prompt), setup de la tool call que se ejecuta cuando el cliente dice que sí (envía nombre, dirección, teléfono, summary). Validado con 5-10 llamadas de prueba.

**Tareas principales:**
- [x] Diseñar identidad del Agente #1 (nombre, personalidad, tono, estrategia)
- [x] Adaptar prompt inbound → outbound para carpet cleaning
- [x] Configurar agente en Retell (voz, idioma, saludo, prompt)
- [x] Configurar tool call de conversión positiva (nombre, dirección, teléfono, summary)
- [x] Validar con 5–10 llamadas de prueba e iterar prompt

### SPEC-03 — Mission Control Shell & Auth
Proyecto Next.js con layout base del dashboard: sidebar con navegación (Batches, Llamadas, Agentes, Sugerencias, Métricas, Settings), Auth.js v5 con rutas protegidas, roles (super_admin / admin / viewer), seed de usuario inicial. La cáscara completa del dashboard con placeholders de contenido.

**Tareas principales:**
- [x] Crear layout base con sidebar de navegación (Batches, Llamadas, Agentes, Sugerencias, Métricas, Settings)
- [x] Implementar rutas protegidas con Auth.js v5
- [x] Definir y aplicar roles (`super_admin` / `admin` / `viewer`)
- [x] Seed de usuario inicial para acceso al dashboard

### SPEC-04 — Call Registration & Contact Import
Endpoint webhook que recibe datos de Retell y persiste cada llamada en DB (transcripción, audio URL, resultado, duración, costo). Importación de CSV/Excel de contactos: al subir el archivo, el sistema crea automáticamente un batch en status `draft` con el nombre del archivo y el total de contactos del CSV. Los contactos se validan contra la lista DNC y se asignan aleatoriamente a los agentes activos. El batch queda en draft hasta que el usuario lo active manualmente desde la vista de batches. Vista de historial de llamadas con búsqueda, filtros y detalle.

**Tareas principales:**
- [x] Crear webhook endpoint que recibe y persiste datos de Retell en DB (transcripción, audio URL, resultado, duración, costo, `processingStatus = unprocessed`)
- [x] Implementar importación de CSV/Excel: al cargar el archivo se crea automáticamente un batch en status `draft` con nombre del archivo y total de contactos
- [x] Validar contactos importados contra lista DNC — los que estén en DNC se incluyen en el batch con status `dnc` y no se llaman
- [x] Lógica de asignación aleatoria de agente a cada contacto importado (distribución equitativa entre agentes activos)
- [x] Mostrar resumen post-carga: X contactos importados, Y en DNC, Z asignados por agente — con link directo al batch creado en draft
- [x] Vista de historial de llamadas con búsqueda, filtros (por resultado, agente, fecha) y detalle de transcripción
- [x] Hacer pruebas para marcar desde Retell y verificar que registra la llamada correctamente

### SPEC-05 — Batch Management & Call Dispatch
Vista de batches en el dashboard: lista todos los batches con su status, nombre, total de contactos y fecha de creación. Cada batch se crea automáticamente al importar un CSV (ver SPEC-04) y arranca en status `draft`. El usuario revisa el batch y cuando decide activarlo presiona "Iniciar batch", lo que arranca un **drip dispatcher**: en lugar de lanzar todas las llamadas de golpe, el sistema lanza una llamada por agente cada X tiempo, según el intervalo configurado en Settings (30 min / 1 hr / 2 hr). Este loop continúa hasta que no queden contactos `pending`. Un batch `running` se puede pausar y reanudar con botones de pausa/play.

**Tareas principales:**
- [ ] Vista de lista de batches: nombre, status, total de contactos, fecha de creación, acciones disponibles por status
- [ ] Vista de detalle de un batch: contactos asignados agrupados por agente, status de cada contacto (`pending`, `called`, `converted`, `rejected`, `dnc`, `no_answer`)
- [ ] Botón "Iniciar batch" (solo visible en batches en `draft`): muestra confirmación con número de llamadas a realizar y el intervalo activo en Settings antes de ejecutar
- [ ] Al confirmar, cambiar batch a `running` e iniciar el drip dispatcher en N8N: lanza una llamada por agente → espera el intervalo configurado → lanza la siguiente → repite
- [ ] El dispatcher respeta los horarios permitidos de Settings — si el intervalo cae fuera de franja horaria, espera al siguiente bloque válido
- [ ] Botón "Pausar" (visible en batches `running`): detiene el drip loop — la llamada activa termina, el loop no continúa, batch pasa a `paused`
- [ ] Botón "Reanudar" (visible en batches `paused`): retoma el drip loop desde el siguiente contacto `pending`, batch vuelve a `running`
- [ ] Tracking de progreso en tiempo real: llamadas realizadas / total, desglosado por agente
- [ ] Batch pasa automáticamente a `completed` cuando no quedan contactos con status `pending`

### SPEC-05b — Call Settings Panel
Panel de configuración de llamadas accesible desde Settings en el sidebar. Centraliza los parámetros que controlan cuándo y cómo opera el drip dispatcher en todos los batches. Solo accesible para roles `super_admin` y `admin`. Los cambios en Settings aplican al siguiente intervalo del dispatcher — no retroactivamente a llamadas ya en curso.

**Parámetros configurables:**

- **Intervalo entre llamadas:** cada cuánto tiempo el drip dispatcher lanza la siguiente llamada por agente. Opciones: 30 min / 1 hora / 2 horas. Default: 1 hora. Este es el parámetro central que controla el ritmo del batch completo.
- **Horarios permitidos:** franjas horarias en las que se pueden hacer llamadas (default: 8:00–10:00 AM y 3:00–5:00 PM, hora de Las Vegas / PT). Si el siguiente intervalo cae fuera de franja, el dispatcher espera al siguiente bloque válido sin pausar el batch.
- **Presupuesto Retell:** sin límite por ahora — el sistema consume lo que el cliente use. El campo existe en Settings pero se deja sin restricción activa en el MVP.

**Tareas principales:**
- [ ] Crear página `/settings` con sección "Configuración de llamadas" (solo `super_admin` / `admin`)
- [ ] Selector de intervalo entre llamadas: 30 min / 1 hora / 2 horas — guardado como setting global en DB
- [ ] El dispatcher en N8N lee el intervalo al inicio de cada ciclo (permite cambiarlo en caliente sin reiniciar el batch)
- [ ] Campo de horarios permitidos: franja de mañana y franja de tarde configurables, con timezone fija a America/Los_Angeles
- [ ] Lógica en el dispatcher: si el siguiente intervalo cae fuera de franja horaria, calcular el tiempo hasta el inicio del siguiente bloque válido y esperar ese delta
- [ ] Campo de presupuesto Retell — visible pero sin restricción activa en MVP (campo para futuro)

---

> OpenClaw analiza las llamadas, sugiere cambios, el humano aprueba, el prompt mejora.

### SPEC-06 — OpenClaw Pipeline & Cron 1 — Análisis de Llamadas
Workflow en N8N que conecta Retell → OpenClaw por agente individual. Cron 1 (12AM): busca llamadas `unprocessed`, las envía a OpenClaw con contexto del agente, OpenClaw genera sugerencias concretas y accionables por agente, sugerencias se persisten en DB con status `pending`, llamadas pasan a `processed`. Configuración de criterios de evaluación (éxito = tool call positiva disparada).

**Tareas principales:**
- [ ] Configurar cuenta/instancia de OpenClaw y credenciales de API
- [ ] Crear workflow en N8N: recibe transcripciones de llamadas → las envía a OpenClaw etiquetadas por agente
- [ ] Configurar cron 12AM para procesar llamadas con `processingStatus = unprocessed`
- [ ] Definir criterios de evaluación en OpenClaw (éxito = tool call positiva disparada durante la llamada)
- [ ] Persistir sugerencias en DB con status `pending` y marcar llamadas como `processed`
- [ ] Manejo de errores y retry en N8N si OpenClaw falla

### SPEC-06b — Cron 2 — Aplicación de Mejoras al Prompt
Una vez que el usuario aprueba sugerencias en el HITL (ver SPEC-07), el Cron 2 las toma y las aplica al prompt de cada agente en Retell. Este spec cubre únicamente el pipeline automático de aplicación — la interfaz de revisión está en SPEC-07. El Cron 2 es el cierre del loop de mejora continua: sin él, las sugerencias aprobadas nunca llegan al agente.

**Decisión:** el Cron 2 es semi-automático — se dispara desde N8N periódicamente, pero solo aplica sugerencias que el usuario ya aprobó explícitamente en el HITL. No hay cambios al prompt sin revisión humana previa.

**Tareas principales:**
- [ ] Configurar Cron 2 en N8N: busca sugerencias con status `accepted` que no hayan sido implementadas, agrupadas por agente
- [ ] Para cada agente con sugerencias aceptadas: tomar el `prompt` actual del agente desde DB, aplicar las mejoras, guardar en `promptDraft`
- [ ] Actualizar el prompt en Retell vía API usando el `promptDraft` generado
- [ ] Marcar las sugerencias aplicadas como `implemented` y actualizar `prompt` en DB con el nuevo texto
- [ ] Manejo de errores: si Retell API falla, reintentar y loggear — no marcar como `implemented` hasta confirmar éxito

### SPEC-07 — HITL Interface & Prompt Review
Sección de sugerencias en Mission Control donde el usuario revisa, aprueba o rechaza las sugerencias generadas por OpenClaw (Cron 1). La interfaz es simple: ver la sugerencia, ver las llamadas que la originaron, y decidir. Una vez aprobadas, el Cron 2 (SPEC-06b) se encarga de aplicarlas automáticamente a Retell — no hay botón "Publicar" manual en esta sección.

**Tareas principales:**
- [ ] Sección de sugerencias pendientes por agente en Mission Control
- [ ] Mostrar texto de sugerencia + llamadas origen (agente, fecha, resultado) con link a la transcripción completa
- [ ] Botón "Aprobar" → cambia status de sugerencia a `accepted` (Cron 2 la aplicará en su siguiente ejecución)
- [ ] Botón "Rechazar" → cambia status a `rejected`, se descarta
- [ ] Vista de prompt actual del agente como referencia al revisar sugerencias
- [ ] Historial de sugerencias: tab o filtro para ver las ya aprobadas/rechazadas/implementadas

---

## 📈 Milestone 4: Escala y visibilidad

> Los 3 agentes están activos, hay métricas y alertas de leads.

### SPEC-08 — Agents #2 & #3 Scale-Up
Diseño de identidades para Agente #2 y #3 (personalidad y approach distintos, informados por los aprendizajes del Agente #1), configuración de ambos en Retell, actualización de la lógica de asignación a distribución equitativa entre 3 agentes (~33% cada uno), verificación con llamadas de prueba.

**Tareas principales:**
- [ ] Diseñar identidades para Agente #2 y #3 basadas en aprendizajes del #1
- [ ] Configurar ambos agentes en Retell (prompt, voz, saludo, tool call)
- [ ] Actualizar lógica de asignación a distribución equitativa (~33% c/u)
- [ ] Validar con llamadas de prueba antes de conectar al batch

### SPEC-09 — Metrics Dashboard & Hot Lead Notifications
Dashboard de métricas básico: por agente (total llamadas, conversiones, tasa de conversión, rechazos) y global (batch completo, mejor agente). Notificaciones de leads calientes: badge/contador en navegación al llegar un resultado positivo, sección "Leads recientes" con nombre, teléfono, agente que lo convirtió y timestamp.

**Tareas principales:**
- [ ] Métricas por agente: total llamadas, conversiones, tasa de conversión, rechazos
- [ ] Métricas globales del batch y mejor agente
- [ ] Badge/contador en navegación para leads calientes
- [ ] Sección "Leads recientes" con nombre, teléfono, agente y timestamp

---

## 🚀 Milestone 5: Testing y entrega

> Todo el ciclo corre de principio a fin sin intervención manual.

### SPEC-10 — End-to-End Testing & Client Handoff
Prueba completa del ciclo: cargar contactos → dispatch → llamadas → registro en DB → Cron OpenClaw → sugerencias en HITL → aprobar → prompt actualizado en Retell. Setup de acceso para el cliente al dashboard, documentación básica de uso (cómo cargar contactos, disparar batch, revisar sugerencias). Revisión de error handling y logging en producción.

**Tareas principales:**
- [ ] Prueba E2E del ciclo completo (contactos → dispatch → DB → OpenClaw → HITL → Retell)
- [ ] Revisar error handling y logging en producción
- [ ] Setup de acceso al dashboard para el cliente
- [ ] Documentar instrucciones básicas de uso (cargar contactos, disparar batch, revisar sugerencias)
