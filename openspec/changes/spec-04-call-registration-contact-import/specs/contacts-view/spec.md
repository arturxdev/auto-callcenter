## ADDED Requirements

### Requirement: Tabla de contactos
La página `/contactos` DEBE mostrar una tabla con todos los contactos, ordenados por fecha de creación descendente. Columnas: nombre (firstName + lastName), teléfono, nombre del agente asignado, status (badge), nombre del batch.

#### Scenario: Tabla con datos
- **WHEN** el usuario navega a `/contactos` y existen contactos en DB
- **THEN** se muestra una tabla paginada con 20 registros por página

#### Scenario: Sin contactos
- **WHEN** no hay contactos en DB
- **THEN** se muestra un estado vacío indicando que no hay contactos y sugiriendo importar

### Requirement: Filtros de contactos
La página DEBE permitir filtrar por: batch, status (pending/called/converted/rejected/dnc/no_answer), y agente. Los filtros DEBEN estar en la URL como searchParams.

#### Scenario: Filtrar por batch
- **WHEN** el usuario selecciona un batch del dropdown
- **THEN** la tabla muestra solo contactos de ese batch

#### Scenario: Filtrar por status
- **WHEN** el usuario selecciona status = 'pending'
- **THEN** la tabla muestra solo contactos pendientes de llamar

### Requirement: Búsqueda de contactos
La página DEBE permitir buscar por nombre o teléfono, con debounce y searchParams.

#### Scenario: Buscar por nombre
- **WHEN** el usuario escribe "Mary" en el campo de búsqueda
- **THEN** la tabla muestra contactos donde firstName o lastName contienen "Mary"

### Requirement: Dialog de importación
La página DEBE tener un botón "Importar" que abre un Dialog (modal) para subir archivo CSV o Excel.

#### Scenario: Abrir dialog de importación
- **WHEN** el usuario hace clic en "Importar"
- **THEN** se abre un Dialog con un input de archivo que acepta .csv, .xlsx, .xls

#### Scenario: Importación exitosa
- **WHEN** el usuario selecciona un archivo válido y confirma
- **THEN** el dialog muestra un loading, luego el resumen (importados, duplicados, DNC, nombre del batch)

#### Scenario: Cerrar dialog y actualizar tabla
- **WHEN** el usuario cierra el dialog después de una importación exitosa
- **THEN** la tabla de contactos se actualiza mostrando los nuevos contactos

### Requirement: Paginación de contactos
La tabla DEBE tener paginación con 20 registros por página via searchParams.

#### Scenario: Navegar entre páginas
- **WHEN** el usuario hace clic en "siguiente"
- **THEN** la URL se actualiza y se muestran los siguientes 20 contactos
