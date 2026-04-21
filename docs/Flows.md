# Bulldog Las Vegas — Flows

Este documento describe todos los flujos del sistema Bulldog Las Vegas, desde que se carga una lista de contactos hasta que el prompt del agente se mejora automáticamente. El sistema está diseñado como un ciclo cerrado de mejora continua: los agentes hacen llamadas, OpenClaw analiza los resultados, sugiere mejoras, y un humano aprueba o rechaza los cambios antes de que se apliquen.

---

## Flow 1: Setup y Carga de Contactos

Flujo inicial para preparar un batch de llamadas outbound. El usuario compra una lista de contactos y la sube al dashboard. Al importar el CSV, el sistema crea automáticamente un batch en status `draft` con el nombre del archivo y el total de contactos. El usuario revisa el batch — ve los contactos asignados por agente — y cuando está listo presiona "Iniciar batch" para disparar las llamadas.

```
Comprar lista de contactos
        │
        ▼
Cargar CSV/Excel en Mission Control
        │
        ▼
Sistema crea batch automático en status DRAFT
┌──────────────────────────────────────┐
│ • Nombre: nombre del archivo CSV     │
│ • Total de contactos del CSV         │
│ • Validación contra lista DNC        │
│ • Asignación aleatoria a agentes     │
└──────────────────────────────────────┘
        │
        ▼
Resumen post-carga:
X contactos importados, Y en DNC,
Z por agente — link al batch en draft
        │
        ▼
Usuario revisa el batch en dashboard
(contactos por agente, status de cada uno)
        │
        ▼
Usuario presiona "Iniciar batch"
→ Confirmación: X llamadas, intervalo: 1hr
        │
        ▼
Batch pasa a RUNNING
Drip dispatcher arranca en N8N
        │
        ▼
┌─────────────────────────────────┐
│  Loop por cada contacto pending │
│                                 │
│  Lanza llamada (1 por agente)   │
│          │                      │
│          ▼                      │
│  ¿Dentro de horario permitido?  │
│    NO → espera al sig. bloque   │
│    SÍ → dispara vía Retell API  │
│          │                      │
│          ▼                      │
│  Espera intervalo (30m/1h/2h)   │
│  (leído de Settings en cada     │
│   ciclo — configurable en vivo) │
│          │                      │
│          ▼                      │
│  ¿Quedan contactos pending?     │
│    SÍ → siguiente ciclo         │
│    NO → batch → COMPLETED       │
└─────────────────────────────────┘
        │
  ┌─────┴─────┐─────────┐
  ▼           ▼          ▼
Agente 1   Agente 2   Agente 3
```

---

## Flow 2: Llamada Outbound

Flujo de una llamada individual. Retell dispara la llamada con el agente asignado. El agente intenta vender el servicio de carpet cleaning. Dependiendo de la respuesta del cliente, se toma una acción diferente. Si el cliente acepta, el agente ejecuta una tool call para guardar sus datos y un representante humano lo contactará después.

```
Retell dispara llamada outbound con el agente asignado
        │
        ▼
  Agente habla con el cliente
        │
        ▼
  ¿Cliente interesado?
        │
   ┌────┼────────┬──────────┐
   ▼    ▼        ▼          ▼
  SÍ   NO      DNC     No contestó
   │    │        │          │
   ▼    ▼        ▼          ▼
Tool   Registra  Agrega    Registra
call   como      a lista   como
datos  RECHAZADO DNC       SIN_RESPUESTA
   │
   ▼
Guarda: nombre, dirección,
teléfono, summary
   │
   ▼
Notificación "Lead caliente"
en Mission Control
   │
   ▼
Representante humano
contacta al cliente
```

---

## Flow 3: Registro de Llamadas

Flujo de cómo se registra cada llamada en Mission Control. Independientemente del resultado, todas las llamadas se guardan en la base de datos con toda su información y se categorizan automáticamente con AI. El status de procesamiento arranca como `NO_PROCESADA` para que OpenClaw sepa que aún no la ha analizado.

```
Llamada termina (cualquier resultado)
        │
        ▼
Webhook/Tool → API de Mission Control
        │
        ▼
Se guarda en DB con status: NO_PROCESADA
┌─────────────────────────────────┐
│ • Transcripción completa        │
│ • Nombre, teléfono, dirección   │
│ • Timestamp, duración, costo    │
│ • Audio de la llamada           │
│ • Resultado (positivo/rechazado │
│   /DNC/sin respuesta)           │
│ • agent_id (qué agente llamó)   │
└─────────────────────────────────┘
        │
        ▼
AI categoriza la llamada automáticamente
(categorías definidas por Super Admin)
```

---

## Flow 4: Cron 1 — Análisis de Llamadas (12:00 AM)

Este cron se ejecuta cada noche a las 12:00 AM. Corre una vez por cada agente. Su trabajo es buscar todas las llamadas que ese agente hizo y que aún no han sido analizadas, enviarlas a OpenClaw para análisis, y generar sugerencias de mejora al prompt. Es el motor de la mejora continua — sin este cron, los agentes nunca mejorarían.

```
⏰ 12:00 AM — Cron se ejecuta POR CADA AGENTE
        │
        ▼
┌──────────────────────────────────────┐
│  Agente 1    Agente 2    Agente 3    │
│     │            │           │       │
│     ▼            ▼           ▼       │
│  Busca sus    Busca sus   Busca sus  │
│  llamadas     llamadas    llamadas   │
│  NO_PROCESADA NO_PROCESADA NO_PROCESADA │
└──────────────────────────────────────┘
        │
        ▼
¿Hay llamadas sin analizar?
        │
   ┌────┴────┐
   NO       SÍ
   │         │
   ▼         ▼
 Nada    Envía transcripciones
 que     a OpenClaw
 hacer        │
              ▼
         OpenClaw analiza:
         • ¿Qué funcionó?
         • ¿Qué falló?
         • ¿Dónde perdió al cliente?
         • ¿Manejó bien las objeciones?
              │
              ▼
         Genera sugerencias concretas
         de mejora al prompt
              │
         ┌────┴────┐
         ▼         ▼
   Sugerencias   Marca llamadas
   guardadas     como PROCESADA
   en DB con
   status:
   PENDIENTE
```

---

## Flow 5: Human-in-the-Loop (HITL)

Este flujo no tiene cron — depende completamente del usuario. Las sugerencias de OpenClaw se acumulan en Mission Control y el usuario las revisa cuando quiera (puede dejarlas acumular días). La interfaz es simple: ver la sugerencia, ver las llamadas que la originaron, y aprobar o rechazar. No hay presión de tiempo.

```
Sugerencias se acumulan en Mission Control
(pueden pasar horas, días, una semana)
        │
        ▼
Usuario entra al dashboard
        │
        ▼
Ve lista de sugerencias PENDIENTES
por agente
        │
        ▼
Para cada sugerencia:
┌────────────────────────────────┐
│ Sugerencia: "Agregar manejo    │
│ de objeción 'ya tengo quien    │
│ me limpie las alfombras'"      │
│                                │
│ Originada por: 5 llamadas      │
│ del Agente 1 (ver transcripc.) │
│                                │
│  [✅ Aprobar]  [❌ Rechazar]   │
└────────────────────────────────┘
        │
   ┌────┴────┐
   ▼         ▼
ACEPTADA   RECHAZADA
(lista     (se descarta)
para Cron 2)
```

---

## Flow 6: Cron 2 — Aplicación de Mejoras al Prompt

Este cron se ejecuta periódicamente desde N8N. Solo actúa sobre sugerencias que el usuario ya aprobó en el HITL — nunca modifica un prompt sin revisión humana previa. Toma las sugerencias `accepted`, las aplica al prompt del agente correspondiente, actualiza Retell vía API y cierra el loop marcándolas como `implemented`.

**Decisión de diseño:** el Cron 2 es semi-automático. El dispatcher es N8N corriendo en background — no hay botón "Publicar" manual. La revisión humana ocurre en el HITL (Flow 5); una vez aprobado, la aplicación es automática.

```
⏰ Cron 2 se ejecuta periódicamente (N8N)
        │
        ▼
Busca sugerencias con status: ACCEPTED
(que no hayan sido implementadas)
        │
        ▼
¿Hay sugerencias aceptadas?
        │
   ┌────┴────┐
   NO       SÍ
   │         │
   ▼         ▼
 Nada    Agrupa sugerencias por agente
 que          │
 hacer        ▼
         Para cada agente con sugerencias:
              │
              ▼
         Toma el prompt actual del agente en DB
              │
              ▼
         Aplica mejoras → guarda en promptDraft
              │
              ▼
         Actualiza prompt en Retell vía API
              │
         ┌────┴────┐
    ERROR │         │ OK
         ▼         ▼
      Retry +   Marca sugerencias
      logging   como IMPLEMENTED
                     │
                     ▼
              Actualiza campo `prompt`
              en DB con el nuevo texto
                     │
                     ▼
         ✅ Agente usa prompt mejorado
         en sus próximas llamadas
```

---

## Máquinas de Estados

### Llamada — Status de Procesamiento

Status interno para que OpenClaw sepa qué llamadas le faltan por analizar. Invisible para el usuario en el dashboard.

```
               Cron 1 (Análisis)
               OpenClaw analiza
NO_PROCESADA ─────────────────────▶ PROCESADA
```

| Status | Descripción |
|---|---|
| `NO_PROCESADA` | Llamada registrada, pendiente de que OpenClaw la analice |
| `PROCESADA` | OpenClaw ya analizó esta llamada en el Cron 1 |

### Llamada — Resultado

Status visible en el dashboard para el usuario. Se asigna al momento de registrar la llamada.

```
POSITIVO ────── Cliente dijo que sí (lead caliente)
RECHAZADO ───── Cliente dijo que no
DNC ─────────── Cliente pidió no ser llamado
SIN_RESPUESTA ─ No contestaron
```

| Resultado | Descripción | Acción |
|---|---|---|
| `POSITIVO` | Cliente aceptó ser contactado | Se notifica como lead caliente, un humano lo llama |
| `RECHAZADO` | Cliente no le interesó | Se registra, no se toma acción adicional |
| `DNC` | Cliente pidió no ser llamado | Se agrega a lista DNC, no se vuelve a llamar |
| `SIN_RESPUESTA` | No contestaron la llamada | Se registra, podría re-intentarse en otro batch |

### Sugerencia — Status

Status de las sugerencias de OpenClaw. El Cron 2 solo procesa las que tienen status `ACEPTADA`.

```
              Usuario aprueba          Cron 2 implementa
PENDIENTE ──────────────────▶ ACEPTADA ──────────────────▶ IMPLEMENTADA
    │
    │         Usuario rechaza
    └────────────────────────▶ RECHAZADA
```

| Status | Descripción |
|---|---|
| `PENDIENTE` | OpenClaw generó la sugerencia, esperando revisión |
| `ACEPTADA` | El usuario aprobó en HITL, lista para que Cron 2 la implemente |
| `RECHAZADA` | El usuario rechazó, se descarta |
| `IMPLEMENTADA` | Cron 2 aplicó los cambios al prompt en Retell |

---

## Resumen de Crons

| Cron | Cuándo | Qué hace | Busca | Produce |
|---|---|---|---|---|
| Cron 1: Análisis | 12:00 AM cada noche | Cada agente analiza sus llamadas no procesadas en OpenClaw | Llamadas `NO_PROCESADA` | Sugerencias `PENDIENTE` + llamadas → `PROCESADA` |
| Cron 2: Mejora | Periódicamente | Implementa sugerencias aceptadas en el prompt de Retell | Sugerencias `ACEPTADA` | Prompt actualizado en Retell + sugerencias → `IMPLEMENTADA` |

---

## Ciclo Completo

```
Cargar contactos → Disparar llamadas → Agentes llaman
        ▲                                      │
        │                                      ▼
Prompt mejorado                      Llamadas registradas
en Retell                            en DB (NO_PROCESADA)
        ▲                                      │
        │                                      ▼
   Cron 2                              Cron 1 (12AM)
   implementa                          OpenClaw analiza
        ▲                                      │
        │                                      ▼
   Sugerencias                         Sugerencias generadas
   ACEPTADAS                           (PENDIENTE)
        ▲                                      │
        │                                      ▼
        └──────── Usuario revisa ◄─────────────┘
                  en HITL
                  (Aprobar/Rechazar)
```
