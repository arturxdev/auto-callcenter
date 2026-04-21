# Bulldog Las Vegas — Roadmap por Sprints

**Deadline:** 26 de marzo de 2026
**Disponibilidad:** ~2 horas/día
**Tiempo total estimado:** ~56 horas (4 semanas)
**Cuenta de Retell:** Del cliente (ya tiene)
**Prompt base:** Agente inbound anterior (funciona bien, solo adaptar a outbound)

---

## Sprint 1 — Agente Outbound #1 (26 feb – 4 mar)

Objetivo: Tener el primer agente outbound funcionando en Retell y haciendo llamadas de prueba exitosas.

> Se empieza con el agente porque es la pieza core — sin agente funcionando, nada más tiene sentido. Además, adaptar el prompt inbound a outbound es lo de menor riesgo y permite validar rápido.

- [ ] **Diseñar la identidad del Agente #1**
  Definir la personalidad, tono de voz y approach de venta del primer agente outbound para carpet cleaning. Debe tener un nombre, estilo de comunicación y estrategia de persuasión únicos. Este será el agente piloto — los otros 2 se crearán después basándose en los aprendizajes de este. Documentar la identidad en un formato que se pueda reutilizar como template para los agentes #2 y #3.

- [ ] **Adaptar el prompt base de inbound a outbound**
  Tomar el prompt del agente inbound anterior (que ya funciona bien) y reescribirlo para outbound de carpet cleaning. El cambio principal es que el agente ahora inicia la conversación (no responde), debe presentarse, ofrecer el servicio de carpet cleaning, manejar objeciones comunes, y guiar al cliente hacia un "sí". El resultado positivo es que el cliente acepte ser contactado por un humano/representante. El prompt debe incluir la identidad diseñada en la tarea anterior.

- [ ] **Configurar el agente en Retell**
  Crear el agente en la cuenta de Retell del cliente. Configurar: voz (seleccionar la que mejor se adapte a la identidad), idioma (inglés), saludo inicial (primera frase que dice el agente al conectar la llamada), y cargar el prompt. Usar la interfaz de Retell directamente.

- [ ] **Configurar la tool call para resultado positivo**
  Configurar una custom tool en Retell que el agente ejecuta cuando el cliente dice que sí. La tool debe enviar los siguientes datos a un endpoint (N8N o directo): nombre del cliente, dirección, número telefónico (ya lo tiene Retell), y un summary/resumen de la llamada generado por el agente. Esta tool es la señal de "conversión exitosa" que después usará OpenClaw para evaluar.

- [ ] **Hacer llamadas de prueba y validar el flujo**
  Realizar al menos 5-10 llamadas de prueba simulando diferentes escenarios: cliente interesado, cliente no interesado, cliente con objeciones, cliente que pide más información, cliente que quiere colgar rápido. Verificar que el agente maneja cada escenario correctamente, que la tool se ejecuta cuando debe, y que los datos se envían correctamente.

- [ ] **Iterar el prompt basándose en resultados**
  Revisar las transcripciones de las llamadas de prueba e identificar puntos débiles: ¿el agente suena natural? ¿maneja bien las objeciones? ¿el saludo es efectivo? ¿la transición hacia el cierre es fluida? Ajustar el prompt y volver a probar hasta que el agente sea consistente y efectivo.

---

## Sprint 2 — Dashboard Básico + Registro de Llamadas (5 mar – 12 mar)

Objetivo: Tener un dashboard mínimo donde se registran las llamadas y se pueden cargar listas de contactos.

> Antes de escalar a más agentes o integrar OpenClaw, necesitas un lugar donde ver los resultados y gestionar contactos. Esto también prepara la base para HITL y métricas.

- [ ] **Inicializar proyecto Mission Control (Next.js)**
  Crear el proyecto Next.js con la estructura base del dashboard. Incluir: configuración de Clerk para autenticación, layout principal con sidebar de navegación (secciones: Agente, Llamadas, Contactos), y deployment inicial en Vercel. Este proyecto será la base para todo Mission Control — tanto para Bulldog como para futuros clientes.

- [ ] **Configurar base de datos**
  Diseñar e implementar el esquema de base de datos en el VPS. Tablas necesarias: users (datos de auth/Clerk), agents (configuración del agente, prompt, voz, idioma), calls (registro de cada llamada: nombre, teléfono, dirección, timestamp, duración, resultado, summary, transcripción), contacts (lista de contactos cargados para llamadas outbound), dnc_list (contactos marcados como "no volver a llamar"). Configurar la conexión desde el proyecto Next.js al VPS.

- [ ] **Implementar webhook/endpoint que recibe datos de Retell**
  Crear un API endpoint en Next.js que reciba los datos de cada llamada desde Retell (vía webhook o tool call — investigar cuál es mejor). El endpoint debe: autenticar la petición, parsear los datos (nombre, teléfono, dirección, summary, transcripción, duración, timestamp), guardarlos en la tabla `calls` de la base de datos, y retornar confirmación. Si el webhook falla, los datos no deben perderse — implementar al menos logging de errores.

- [ ] **Vista de historial de llamadas**
  Crear la página principal del dashboard que muestra todas las llamadas registradas en una tabla. Columnas: nombre del cliente, teléfono, fecha/hora, duración, resultado (positivo/negativo), summary breve. Debe tener paginación, búsqueda por nombre/teléfono, y filtro por resultado. Al hacer clic en una llamada se abre el detalle con el summary completo y la transcripción.

- [ ] **Funcionalidad para cargar lista de contactos**
  Implementar la funcionalidad de subir un archivo CSV o Excel con la lista de contactos para llamadas outbound. El archivo debe tener al mínimo: nombre y teléfono. Al cargar, los contactos se guardan en la tabla `contacts` y se verifican contra la lista DNC (si el contacto está en DNC, se marca pero no se elimina). Mostrar un resumen post-carga: X contactos importados, Y duplicados, Z en lista DNC.

- [ ] **Lógica de asignación aleatoria de contactos al agente**
  Implementar la lógica que toma los contactos cargados y los asigna aleatoriamente al agente (por ahora solo 1 agente, pero la lógica debe soportar múltiples agentes para el Sprint 4). Cada contacto se marca con el agente asignado y un status (pendiente, llamado, convertido, rechazado, DNC).

- [ ] **Botón para disparar batch de llamadas manualmente**
  Crear un botón en el dashboard que, al presionarlo, desencadena todas las llamadas pendientes del batch. Debe mostrar una confirmación antes de ejecutar ("¿Estás seguro? Se van a realizar X llamadas"). Las llamadas se disparan usando la API de Retell para llamadas outbound. Implementar un estado visual del progreso del batch (llamadas realizadas / total).

- [ ] **Lista interna de DNC**
  Implementar la gestión de la lista Do Not Call. Un contacto se agrega al DNC si: el cliente dice "no me vueltas a llamar" durante la llamada (el agente debe detectar esto y marcarlo vía tool), o el admin lo marca manualmente desde el dashboard. Los contactos en DNC se excluyen automáticamente de futuros batches de llamadas. Mostrar la lista DNC en una sección del dashboard con opción de remover contactos si es necesario.

---

## Sprint 3 — OpenClaw + Loop de Mejora (13 mar – 19 mar)

Objetivo: Conectar OpenClaw para que analice transcripciones y sugiera mejoras al prompt del agente.

> Una vez que tienes llamadas reales registradas en el dashboard, ya hay data para que OpenClaw analice. Este es el momento de integrar el loop de mejora.

- [ ] **Integrar OpenClaw desde cero**
  Configurar OpenClaw para el proyecto. Esto incluye: crear la cuenta/instancia de OpenClaw, configurar las credenciales de API, y establecer la conexión básica. OpenClaw será el motor de análisis que evalúa cada llamada y genera sugerencias de mejora para el prompt de cada agente individual.

- [ ] **Configurar flujo Retell → N8N → OpenClaw**
  Crear un workflow en N8N que: recibe las transcripciones de las llamadas (ya sea del webhook de Retell o de la base de datos de Mission Control), las formatea según lo que OpenClaw espera, y las envía a OpenClaw para análisis. El workflow debe incluir manejo de errores y retry en caso de fallo. Cada transcripción debe ir etiquetada con el ID del agente que realizó la llamada.

- [ ] **Definir criterios de evaluación en OpenClaw**
  Configurar los criterios que OpenClaw usa para evaluar cada llamada. El criterio principal de éxito es: ¿se desencadenó la tool call de resultado positivo? (el cliente aceptó ser contactado por un humano). Criterios secundarios a considerar: ¿el agente mantuvo la conversación? ¿manejó objeciones? ¿el tono fue consistente con su identidad? ¿hubo momentos donde el agente perdió al cliente? OpenClaw debe generar un score y observaciones específicas por llamada.

- [ ] **OpenClaw genera sugerencias de mejora al prompt**
  Configurar OpenClaw para que, basándose en el análisis de las transcripciones, genere sugerencias concretas de cambios al prompt del agente. Las sugerencias deben ser por agente individual — cada agente analiza sus propias llamadas y es autocrítico sobre qué falló. Las sugerencias deben ser accionables (ej. "Agregar manejo de la objeción 'ya tengo quien me limpie las alfombras'" no "Mejorar el manejo de objeciones").

- [ ] **Almacenar sugerencias en la base de datos**
  Crear la tabla `prompt_suggestions` en la base de datos para almacenar las sugerencias de OpenClaw. Campos: agent_id, suggestion_text, source_call_ids (las llamadas que originaron la sugerencia), status (pending, approved, rejected), created_at, reviewed_at, reviewed_by. Las sugerencias nuevas llegan con status "pending".

- [ ] **Interfaz HITL en Mission Control: aprobar/rechazar sugerencias**
  Crear una sección en el dashboard de Mission Control donde Arturo y el cliente pueden ver las sugerencias pendientes de OpenClaw. Cada sugerencia muestra: el texto de la sugerencia, las llamadas que la originaron (con link a la transcripción), y dos botones: "Aprobar" y "Rechazar". La interfaz debe ser simple — sin comparador de versiones ni historial avanzado (eso es post-MVP).

- [ ] **Flujo borrador → publicar al aprobar sugerencia**
  Cuando se aprueba una sugerencia, el cambio se aplica al prompt como borrador. El usuario puede ver el prompt actualizado y hacer clic en "Publicar" para que se actualice en Retell vía API. Esto previene que un cambio accidental rompa el agente — siempre hay un paso de revisión antes de que el cambio se refleje en producción.

---

## Sprint 4 — Agentes #2 y #3 + Métricas + Testing (20 mar – 26 mar)

Objetivo: Escalar a 3 agentes, agregar métricas básicas, y dejar todo listo para producción.

> El primer agente ya está validado y el loop de mejora funciona. Ahora se replican los otros 2 agentes y se agrega visibilidad con métricas.

- [ ] **Diseñar identidades de Agente #2 y Agente #3**
  Crear 2 identidades nuevas con personalidades y approaches de venta distintos al Agente #1. El objetivo es que cada agente tenga un estilo diferente para maximizar conversiones en distintos tipos de clientes. Documentar cada identidad con: nombre, personalidad, tono, estrategia de venta, y frases clave. Usar los aprendizajes del Agente #1 (qué funcionó, qué no) para informar el diseño.

- [ ] **Crear Agente #2 y Agente #3 en Retell**
  Configurar ambos agentes en la cuenta de Retell del cliente. Cada uno con: su propio prompt (basado en su identidad), voz diferente, saludo inicial único, y la misma tool call de resultado positivo. Verificar que ambos agentes funcionan correctamente con llamadas de prueba antes de conectarlos al batch.

- [ ] **Actualizar lógica de asignación para 3 agentes**
  Modificar la lógica de asignación aleatoria en Mission Control para distribuir contactos entre los 3 agentes. La distribución debe ser equitativa (33% cada uno aproximadamente). Asegurarse de que el dashboard muestra qué agente fue asignado a cada contacto y qué agente realizó cada llamada. Esto es fundamental para que OpenClaw pueda evaluar cada agente por separado.

- [ ] **Dashboard de métricas básico**
  Crear una sección de métricas en Mission Control con un resumen simple. Métricas por agente: total de llamadas hechas, conversiones (cliente dijo que sí), tasa de conversión (%), tasa de rechazo, llamadas donde el cliente colgó rápido. Métricas globales: total de llamadas del batch, conversión general, mejor agente por tasa de conversión. No necesita ser un dashboard elaborado — una tabla/resumen claro es suficiente.

- [ ] **Notificación en Mission Control para leads calientes**
  Implementar una notificación visual en el dashboard cuando un agente logra un resultado positivo (lead caliente). Debe ser visible al entrar al dashboard — puede ser un badge/contador en la navegación y una sección de "Leads recientes" con los datos del cliente (nombre, teléfono, agente que lo convirtió, timestamp). El objetivo es que el equipo sepa rápidamente a quién llamar de vuelta.

- [ ] **Testing completo del flujo end-to-end**
  Realizar una prueba completa de todo el sistema: cargar lista de contactos → disparar batch de llamadas → los 3 agentes realizan llamadas → los resultados se registran en Mission Control → OpenClaw analiza las transcripciones → sugerencias aparecen en HITL → aprobar una sugerencia → verificar que el prompt se actualiza en Retell. Documentar cualquier bug o punto de fricción encontrado.

- [ ] **Entrega al cliente para pruebas finales**
  Preparar el entorno para que el cliente pueda probar el sistema. Dar acceso al dashboard de Mission Control, explicar cómo cargar contactos, disparar llamadas, y revisar sugerencias de OpenClaw. Documentar instrucciones básicas de uso. El cliente valida con llamadas reales antes de ir a producción completa.

---

## Fuera del Scope (Post-deadline)

- Límites de llamadas por día/semana (se define con el tiempo)
- Horarios válidos para llamar (se define con el tiempo)
- Presupuesto definido para Retell (no se discutió)
- Dashboard de métricas avanzado
- Múltiples agentes por usuario
- Importar números de Twilio
- Integraciones con CRMs (Fase 3 — Enterprise)
