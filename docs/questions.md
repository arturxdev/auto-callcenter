# Questions — Bulldog Las Vegas

Preguntas para definir y refinar el sistema. El agente genera preguntas
nuevas cuando detecta huecos. Tú respondes. El agente actualiza el estado
y mueve el bloque a Respondidas.

---

## Pendientes

#### ¿Qué acción concreta se toma cuando un cliente dice que sí?
- **Área:** Agentes de Voz
- **Estado:** ⏳ Pendiente
- **Impacto:** Define el criterio de éxito para OpenClaw y qué datos guarda la tool call
- **Respuesta:** —

#### ¿Hay límite de llamadas por día o por semana?
- **Área:** Llamadas Outbound
- **Estado:** ⏳ Pendiente
- **Impacto:** Define si se necesita un sistema de throttling en N8N
- **Respuesta:** —

---

## Respondidas

#### ¿Qué horarios son válidos para hacer llamadas?
- **Área:** Llamadas Outbound
- **Estado:** ✅ Respondido
- **Impacto:** Define el scheduling del dispatcher en SPEC-05 y los defaults de Settings en SPEC-05b
- **Respuesta:** 8:00–10:00 AM y 3:00–5:00 PM hora de Las Vegas (America/Los_Angeles). Configurables desde el panel de Settings. Fuera de estas franjas el dispatcher no inicia nuevas llamadas aunque el batch esté `running`.

#### ¿Hay presupuesto definido para las llamadas de Retell?
- **Área:** Infraestructura y Costos
- **Estado:** ✅ Respondido
- **Impacto:** Define el tamaño máximo de los batches y la frecuencia de las campañas
- **Respuesta:** Sin límite por ahora — el sistema consume lo que el cliente use. El campo existe en Settings (SPEC-05b) pero sin restricción activa en el MVP.

---

## Respondidas

#### ¿Se empieza con un agente o los 3 de una vez?
- **Área:** Agentes de Voz
- **Estado:** ✅ Respondido
- **Impacto:** Define el orden de desarrollo y cuándo se puede empezar a iterar
- **Respuesta:** Empezar con 1 agente, validarlo en Retell, y después crear los otros 2 de jalón.

#### ¿Qué diferencia a cada agente entre sí?
- **Área:** Agentes de Voz
- **Estado:** ✅ Respondido
- **Impacto:** Define cuánto trabajo de diseño hay antes de empezar a construir
- **Respuesta:** Hay que diseñar las 3 identidades desde cero — tono, personalidad y approach de venta distintos.

#### ¿El prompt base del agente inbound anterior funciona bien?
- **Área:** Agentes de Voz
- **Estado:** ✅ Respondido
- **Impacto:** Define si se puede reutilizar como base o hay que escribir desde cero
- **Respuesta:** Sí funciona bien — solo hay que adaptarlo de inbound a outbound.

#### ¿De dónde salen los contactos para las llamadas?
- **Área:** Llamadas Outbound
- **Estado:** ✅ Respondido
- **Impacto:** Define el flujo de carga de contactos en Mission Control
- **Respuesta:** Se compran listas, se cargan en Mission Control como CSV/Excel, y el sistema las asigna aleatoriamente a los agentes.

#### ¿Quién dispara las llamadas?
- **Área:** Llamadas Outbound
- **Estado:** ✅ Respondido
- **Impacto:** Define si el sistema necesita automatización o es manual
- **Respuesta:** Manual — se carga el batch y se pulsa un botón para disparar todas las llamadas.

#### ¿Cómo se maneja el Do Not Call?
- **Área:** Llamadas Outbound
- **Estado:** ✅ Respondido
- **Impacto:** Define si se necesita integración con registro DNC externo o solo lista interna
- **Respuesta:** Lista interna propia — se respeta automáticamente al asignar contactos a batches.

#### ¿Cómo llegan las transcripciones a OpenClaw?
- **Área:** OpenClaw + Loop de Mejora
- **Estado:** ✅ Respondido
- **Impacto:** Define la arquitectura del pipeline de análisis
- **Respuesta:** Retell → N8N → OpenClaw.

#### ¿Las sugerencias de mejora aplican a todos los agentes o por agente individual?
- **Área:** OpenClaw + Loop de Mejora
- **Estado:** ✅ Respondido
- **Impacto:** Define cómo OpenClaw agrupa y etiqueta las transcripciones antes de analizarlas
- **Respuesta:** Por agente individual — cada agente analiza sus propias llamadas y genera sugerencias para su propio prompt.

#### ¿La plataforma HITL se construye o es algo existente?
- **Área:** Human-in-the-Loop
- **Estado:** ✅ Respondido
- **Impacto:** Define si hay que desarrollar la interfaz desde cero
- **Respuesta:** Se construye custom dentro de Mission Control (Next.js).

#### ¿Qué tan sofisticada necesita ser la interfaz HITL?
- **Área:** Human-in-the-Loop
- **Estado:** ✅ Respondido
- **Impacto:** Define el scope del desarrollo del dashboard
- **Respuesta:** Simple — solo aprobar o rechazar cambios al prompt. Sin historial ni comparador de versiones.

#### ¿Se necesita dashboard de métricas?
- **Área:** Métricas
- **Estado:** ✅ Respondido
- **Impacto:** Define cuánto trabajo extra hay en Mission Control
- **Respuesta:** Básico — resumen simple por agente: llamadas, conversiones y tasa de conversión.

#### ¿El cliente tiene cuenta de Retell o se usa la tuya?
- **Área:** Infraestructura y Costos
- **Estado:** ✅ Respondido
- **Impacto:** Define quién paga las llamadas y quién tiene acceso a la configuración
- **Respuesta:** El cliente tiene su propia cuenta de Retell.

#### ¿Se integra con algún CRM externo?
- **Área:** CRM
- **Estado:** ✅ Respondido
- **Impacto:** Define si hay integraciones adicionales que desarrollar
- **Respuesta:** Sin CRM externo — todo se maneja dentro de Mission Control.
