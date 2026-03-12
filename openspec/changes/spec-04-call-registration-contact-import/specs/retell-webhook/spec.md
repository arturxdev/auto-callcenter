## ADDED Requirements

### Requirement: Persistir metadata post-call de Retell
El sistema DEBE exponer un endpoint `POST /api/webhook/retell` que reciba la metadata al terminar una llamada de Retell. El endpoint DEBE buscar el agente por `retellAgentId`, buscar el contacto por teléfono, calcular la duración en segundos, y guardar en la tabla `calls`: retellCallId, agentId, contactId, customerPhone, startedAt, endedAt, durationSeconds, transcript, audioUrl, cost.

#### Scenario: Llamada registrada por primera vez
- **WHEN** Retell envía datos post-call con un `retellCallId` nuevo y no existe registro previo
- **THEN** el sistema crea un registro en `calls` con todos los campos mapeados del payload, y retorna HTTP 200

#### Scenario: La tool ya creó un registro parcial para este teléfono
- **WHEN** Retell envía post-call y ya existe un registro parcial creado por el webhook de tool (correlación por phone)
- **THEN** el sistema actualiza el registro existente con la metadata de Retell (retellCallId, duration, transcript, audioUrl, timestamps) sin perder los datos de la tool (name, address, date, block)

### Requirement: Persistir resultado de tool-call del agente
El sistema DEBE exponer un endpoint `POST /api/webhook/retell-tool` que reciba el resultado de la tool del agente cuando el cliente acepta la oferta. El payload viene de N8N con: `{ name, address, phone, date, block, time, transcription }`. Este evento indica una conversión positiva.

#### Scenario: Tool-call llega antes que post-call
- **WHEN** N8N envía el resultado de la tool y no existe registro de llamada para ese teléfono
- **THEN** el sistema crea un registro en `calls` con customerName=name, customerAddress=address, customerPhone=phone, summary (incluyendo date y block), transcript=transcription, y result='positive'

#### Scenario: Tool-call llega después de post-call
- **WHEN** N8N envía el resultado de la tool y ya existe un registro de llamada para ese teléfono
- **THEN** el sistema actualiza el registro existente con customerName, customerAddress, summary (date, block), y result='positive'

### Requirement: Actualizar estado de contacto tras llamada
El sistema DEBE actualizar el campo `status` del contacto asociado cuando se registra una llamada con resultado definitivo.

#### Scenario: Contacto marcado como convertido
- **WHEN** se registra una llamada con result = 'positive' y existe un contacto asociado por teléfono
- **THEN** el sistema actualiza `contacts.status` a 'converted'

#### Scenario: Contacto marcado según resultado negativo
- **WHEN** se registra una llamada con result = 'rejected', 'dnc', o 'no_answer'
- **THEN** el sistema actualiza `contacts.status` al valor correspondiente ('rejected', 'dnc', 'no_answer')

### Requirement: Alimentar lista DNC automáticamente
Cuando una llamada tiene resultado 'dnc', el sistema DEBE insertar el teléfono en la tabla `dncList` automáticamente.

#### Scenario: Teléfono agregado a DNC
- **WHEN** se registra una llamada con result = 'dnc'
- **THEN** el sistema inserta un registro en `dncList` con el phone, sourceCallId, y reason = 'Customer requested'

#### Scenario: Teléfono ya existe en DNC
- **WHEN** se registra una llamada con result = 'dnc' y el teléfono ya está en `dncList`
- **THEN** el sistema no falla (ignora el conflicto) y continúa normalmente

### Requirement: Endpoints públicos sin autenticación de sesión
Ambos endpoints webhook NO DEBEN estar protegidos por sesión de Auth.js (son endpoints externos). Por ahora son abiertos — sin verificación de firma.

#### Scenario: Petición externa procesada
- **WHEN** cualquier petición llega a `POST /api/webhook/retell` o `POST /api/webhook/retell-tool` con payload válido
- **THEN** el sistema procesa el evento normalmente sin requerir sesión ni firma
