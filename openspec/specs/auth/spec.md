## ADDED Requirements

### Requirement: Login con email y password
El sistema SHALL autenticar usuarios mediante email y contraseña. Las credenciales se validan contra la base de datos. La contraseña se almacena hasheada con bcryptjs. Al autenticarse exitosamente, Auth.js emite un JWT firmado almacenado en una cookie HTTP-only.

#### Scenario: Login exitoso
- **WHEN** el usuario envía email y contraseña válidos en el formulario de login
- **THEN** el sistema emite un JWT firmado, lo guarda en cookie HTTP-only y redirige a `/dashboard/llamadas`

#### Scenario: Credenciales incorrectas
- **WHEN** el usuario envía email o contraseña incorrectos
- **THEN** el sistema muestra un mensaje de error y no emite token

#### Scenario: Campos vacíos
- **WHEN** el usuario envía el formulario con campos vacíos
- **THEN** el sistema muestra validación de campos requeridos sin hacer request a la API

---

### Requirement: Protección de rutas del dashboard
El sistema SHALL bloquear el acceso a cualquier ruta bajo `/dashboard/*` si el usuario no tiene un JWT válido.

#### Scenario: Acceso sin token
- **WHEN** un usuario sin JWT válido intenta acceder a cualquier ruta `/dashboard/*`
- **THEN** el sistema redirige a `/login`

#### Scenario: Acceso con token válido
- **WHEN** un usuario con JWT válido accede a una ruta `/dashboard/*`
- **THEN** el sistema permite el acceso y renderiza la página sin consultar la base de datos

---

### Requirement: JWT con datos del usuario
El sistema SHALL incluir `id`, `email` y `role` del usuario en el payload del JWT. El JWT SHALL verificarse en el middleware sin queries a la base de datos.

#### Scenario: Token incluye rol
- **WHEN** el usuario inicia sesión
- **THEN** el JWT contiene el campo `role` del usuario

#### Scenario: Rol disponible en componentes de servidor
- **WHEN** un componente de servidor llama a `auth()`
- **THEN** el objeto de sesión incluye el campo `role` extraído del JWT

#### Scenario: Rol disponible en componentes de cliente
- **WHEN** un componente de cliente llama a `useSession()`
- **THEN** el objeto de sesión incluye el campo `role` extraído del JWT

#### Scenario: JWT persiste entre recargas
- **WHEN** el usuario recarga la página con una cookie JWT válida
- **THEN** el sistema mantiene la sesión activa sin requerir nuevo login

#### Scenario: JWT expira
- **WHEN** el JWT de un usuario llega a su fecha de expiración
- **THEN** el sistema rechaza el token y redirige al login en el próximo acceso

---

### Requirement: Logout
El sistema SHALL permitir al usuario cerrar su sesión eliminando la cookie JWT.

#### Scenario: Logout exitoso
- **WHEN** el usuario ejecuta la acción de signOut
- **THEN** la cookie JWT se elimina del cliente y el usuario es redirigido a `/login`
