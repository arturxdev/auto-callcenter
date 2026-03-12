## ADDED Requirements

### Requirement: Importar contactos desde archivo CSV
El sistema DEBE aceptar archivos CSV con contactos para llamadas outbound. El parsing DEBE usar `papaparse` con headers automáticos. Las columnas mínimas requeridas son: `phone`. Columnas opcionales: `firstName`/`first_name`, `lastName`/`last_name`, `address`.

#### Scenario: CSV válido con todas las columnas
- **WHEN** el usuario sube un CSV con columnas firstName, lastName, phone, address
- **THEN** el sistema parsea todos los registros y los prepara para inserción

#### Scenario: CSV con solo columna phone
- **WHEN** el usuario sube un CSV con solo la columna phone
- **THEN** el sistema parsea los teléfonos y deja firstName, lastName, address como null

#### Scenario: CSV sin columna phone
- **WHEN** el usuario sube un CSV que no contiene una columna phone o telefono
- **THEN** el sistema retorna error indicando que la columna phone es requerida

### Requirement: Importar contactos desde archivo Excel
El sistema DEBE aceptar archivos Excel (.xlsx, .xls) y leer la primera hoja. El parsing DEBE usar la librería `xlsx` (SheetJS).

#### Scenario: Excel válido
- **WHEN** el usuario sube un archivo .xlsx con contactos en la primera hoja
- **THEN** el sistema parsea los registros igual que un CSV

### Requirement: Normalización de headers
El sistema DEBE normalizar variantes comunes de nombres de columna al parsear: `nombre`→firstName, `apellido`→lastName, `telefono`/`teléfono`→phone, `direccion`/`dirección`→address.

#### Scenario: Headers en español
- **WHEN** el archivo tiene columnas "nombre", "apellido", "telefono", "direccion"
- **THEN** el sistema las mapea correctamente a firstName, lastName, phone, address

### Requirement: Validación contra lista DNC
Al importar, el sistema DEBE verificar cada teléfono contra la tabla `dncList`. Los contactos cuyo teléfono esté en DNC DEBEN crearse con status = 'dnc'.

#### Scenario: Contacto en lista DNC
- **WHEN** se importa un contacto cuyo teléfono existe en `dncList`
- **THEN** el contacto se crea con status = 'dnc' (no se descarta)

#### Scenario: Contacto no en DNC
- **WHEN** se importa un contacto cuyo teléfono no está en `dncList`
- **THEN** el contacto se crea con status = 'pending'

### Requirement: Detección de duplicados
El sistema DEBE detectar contactos cuyo teléfono ya existe en la tabla `contacts` y excluirlos de la importación.

#### Scenario: Teléfono duplicado
- **WHEN** se importa un contacto cuyo teléfono ya existe en `contacts`
- **THEN** el contacto se omite y se incrementa el contador de duplicados

### Requirement: Asignación round-robin de agentes
El sistema DEBE asignar los contactos importados a los agentes activos (`isActive = true`) usando distribución round-robin para garantizar asignación equitativa.

#### Scenario: 3 agentes activos, 9 contactos
- **WHEN** se importan 9 contactos y hay 3 agentes activos
- **THEN** cada agente recibe exactamente 3 contactos

#### Scenario: Sin agentes activos
- **WHEN** se importan contactos pero no hay agentes con isActive = true
- **THEN** el sistema retorna error indicando que no hay agentes activos disponibles

### Requirement: Creación automática de batch
Al importar contactos, el sistema DEBE crear un batch automáticamente con nombre en formato `"Import YYYY-MM-DD HH:mm"`, asociado al usuario autenticado.

#### Scenario: Batch creado al importar
- **WHEN** el usuario importa un archivo con 50 contactos válidos
- **THEN** el sistema crea un batch con nombre auto-generado, totalContacts = 50, status = 'draft'

### Requirement: Resumen post-importación
El sistema DEBE retornar un resumen después de la importación con: contactos importados, duplicados omitidos, contactos marcados como DNC, ID y nombre del batch creado.

#### Scenario: Resumen completo
- **WHEN** se importa un archivo con 100 filas: 80 válidas, 10 duplicadas, 10 en DNC
- **THEN** el sistema retorna { imported: 90, duplicates: 10, dnc: 10, batchId, batchName } (los DNC cuentan como importados porque se crean en DB)

### Requirement: Autenticación requerida para importar
El Server Action de importación DEBE verificar que hay una sesión autenticada via `auth()`. Sin sesión, DEBE rechazar la operación.

#### Scenario: Usuario no autenticado intenta importar
- **WHEN** se invoca el server action sin sesión válida
- **THEN** el sistema retorna error de autenticación
