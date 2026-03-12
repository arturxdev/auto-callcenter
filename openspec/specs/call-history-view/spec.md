## ADDED Requirements

### Requirement: Tabla de historial de llamadas
La página `/llamadas` DEBE mostrar una tabla con todas las llamadas registradas, ordenadas por fecha descendente. Columnas: nombre del cliente, teléfono, nombre del agente, duración (formato mm:ss), resultado (badge de color), fecha.

#### Scenario: Tabla con datos
- **WHEN** el usuario navega a `/llamadas` y existen llamadas en DB
- **THEN** se muestra una tabla con las llamadas más recientes, paginada con 20 registros por página

#### Scenario: Sin llamadas
- **WHEN** el usuario navega a `/llamadas` y no hay llamadas en DB
- **THEN** se muestra un estado vacío indicando que no hay llamadas registradas

### Requirement: Filtros de llamadas
La página DEBE permitir filtrar llamadas por: resultado (positive/rejected/dnc/no_answer), agente, y rango de fechas. Los filtros DEBEN estar en la URL como searchParams.

#### Scenario: Filtrar por resultado
- **WHEN** el usuario selecciona el filtro resultado = 'positive'
- **THEN** la tabla muestra solo llamadas con result = 'positive' y la URL refleja el filtro

#### Scenario: Filtrar por agente
- **WHEN** el usuario selecciona un agente del dropdown
- **THEN** la tabla muestra solo llamadas de ese agente

#### Scenario: Combinar filtros
- **WHEN** el usuario aplica filtro de resultado Y agente simultáneamente
- **THEN** la tabla muestra solo llamadas que cumplan ambos criterios

### Requirement: Búsqueda de llamadas
La página DEBE permitir buscar por nombre de cliente o teléfono. La búsqueda DEBE estar debounced y usar searchParams.

#### Scenario: Buscar por nombre
- **WHEN** el usuario escribe "John" en el campo de búsqueda
- **THEN** la tabla muestra llamadas donde customerName contiene "John"

#### Scenario: Buscar por teléfono
- **WHEN** el usuario escribe "702" en el campo de búsqueda
- **THEN** la tabla muestra llamadas donde customerPhone contiene "702"

### Requirement: Paginación
La tabla DEBE tener paginación con 20 registros por página. La navegación de páginas DEBE usar searchParams.

#### Scenario: Navegar a página 2
- **WHEN** el usuario hace clic en "página 2"
- **THEN** la URL se actualiza con page=2 y la tabla muestra los registros 21-40

### Requirement: Detalle de llamada en panel lateral
Al hacer clic en una fila, DEBE abrirse un Sheet (panel lateral derecho) con el detalle completo de la llamada: info del cliente (nombre, teléfono, dirección), metadata (agente, duración, resultado, fecha), summary, transcripción completa en área scrollable, y reproductor de audio si existe audioUrl.

#### Scenario: Abrir detalle
- **WHEN** el usuario hace clic en una fila de la tabla
- **THEN** se abre un Sheet lateral con toda la información de esa llamada

#### Scenario: Llamada sin audio
- **WHEN** el usuario abre el detalle de una llamada sin audioUrl
- **THEN** el Sheet muestra toda la info pero no muestra el reproductor de audio

#### Scenario: Transcripción larga
- **WHEN** la transcripción excede el alto visible del Sheet
- **THEN** la sección de transcripción es scrollable independientemente

### Requirement: Badge de resultado con colores
Los resultados de llamada DEBEN mostrarse como badges de colores: positive = verde, rejected = rojo, dnc = naranja, no_answer = gris.

#### Scenario: Badge positive
- **WHEN** una llamada tiene result = 'positive'
- **THEN** se muestra un badge verde con texto "positive"
