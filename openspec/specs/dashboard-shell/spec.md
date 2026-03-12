## ADDED Requirements

### Requirement: Estética minimalista inspirada en Linear
El sistema SHALL implementar una interfaz visual minimalista inspirada en Linear, usando shadcn/ui (new-york style) y Tailwind CSS. El diseño SHALL usar fondo oscuro, tipografía densa y bordes sutiles — sin gradientes, sombras decorativas ni animaciones innecesarias.

#### Scenario: Fondo y paleta de color
- **WHEN** el usuario accede a cualquier página del dashboard
- **THEN** la interfaz muestra fondo `zinc-950` con texto `zinc-100` y bordes `zinc-800`

#### Scenario: Sin elementos decorativos superfluos
- **WHEN** el usuario navega por el dashboard
- **THEN** no hay gradientes, imágenes de fondo, ni animaciones de entrada — solo contenido y estructura

---

### Requirement: Layout base con sidebar de navegación
El sistema SHALL renderizar un layout persistente con sidebar en todas las rutas `/dashboard/*`. El sidebar SHALL contener enlaces a las secciones: Llamadas, Contactos, Agentes, Sugerencias y Métricas.

#### Scenario: Navegación entre secciones
- **WHEN** el usuario hace clic en un item del sidebar
- **THEN** la ruta cambia a la sección correspondiente y el item queda marcado como activo

#### Scenario: Item activo resaltado
- **WHEN** el usuario está en una ruta de sección (ej. `/dashboard/llamadas`)
- **THEN** el item correspondiente del sidebar muestra estado visual activo

---

### Requirement: Rutas placeholder por sección
El sistema SHALL tener rutas accesibles para cada sección del sidebar. Cada página SHALL mostrar el nombre de la sección y un mensaje indicando que el contenido está en construcción.

#### Scenario: Acceso a sección Llamadas
- **WHEN** el usuario navega a `/dashboard/llamadas`
- **THEN** el sistema muestra la página de Llamadas (aunque sea placeholder)

#### Scenario: Acceso a sección Contactos
- **WHEN** el usuario navega a `/dashboard/contactos`
- **THEN** el sistema muestra la página de Contactos

#### Scenario: Acceso a sección Agentes
- **WHEN** el usuario navega a `/dashboard/agentes`
- **THEN** el sistema muestra la página de Agentes

#### Scenario: Acceso a sección Sugerencias
- **WHEN** el usuario navega a `/dashboard/sugerencias`
- **THEN** el sistema muestra la página de Sugerencias

#### Scenario: Acceso a sección Métricas
- **WHEN** el usuario navega a `/dashboard/metricas`
- **THEN** el sistema muestra la página de Métricas

---

### Requirement: Redirección desde raíz del dashboard
El sistema SHALL redirigir `/dashboard` hacia `/dashboard/llamadas` como sección por defecto.

#### Scenario: Acceso a la raíz del dashboard
- **WHEN** el usuario navega a `/dashboard`
- **THEN** el sistema redirige automáticamente a `/dashboard/llamadas`

---

### Requirement: Header con información de sesión
El layout SHALL incluir un header que muestre el nombre o email del usuario autenticado y un botón para cerrar sesión.

#### Scenario: Visualización del usuario actual
- **WHEN** el usuario está autenticado y en el dashboard
- **THEN** el header muestra el nombre o email del usuario

#### Scenario: Cerrar sesión desde el header
- **WHEN** el usuario hace clic en el botón de logout
- **THEN** la sesión se cierra y el usuario es redirigido a `/login`
