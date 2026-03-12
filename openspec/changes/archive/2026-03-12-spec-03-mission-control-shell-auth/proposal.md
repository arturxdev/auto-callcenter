## Why

El sistema necesita una interfaz de control para operar los 3 agentes AI outbound — sin dashboard no hay forma de ver resultados, gestionar contactos ni revisar sugerencias de OpenClaw. Este es el primer bloque de código del proyecto: establece la base técnica (auth, DB, layout) sobre la que se construye todo lo demás.

## What Changes

- Nuevo layout de dashboard con sidebar de navegación (Llamadas, Contactos, Agentes, Sugerencias, Métricas)
- Autenticación con Auth.js v5 — provider credentials (email/password), sin OAuth externo
- Schema de base de datos completo en Drizzle + PostgreSQL (todas las tablas del sistema)
- Rutas protegidas via middleware de Auth.js
- Sistema de roles: `super_admin` / `admin` / `viewer`
- Seed script con usuario inicial y 3 agentes placeholder

## Capabilities

### New Capabilities

- `dashboard-shell`: Layout base del dashboard con sidebar, navegación y rutas placeholder por sección
- `auth`: Autenticación con Auth.js v5 credentials, sesiones, middleware de protección y roles
- `database-schema`: Schema Drizzle completo con todas las tablas del sistema y seed inicial

### Modified Capabilities

<!-- ninguna — es greenfield -->

## Impact

- **Dependencias nuevas:** `next-auth@beta`, `@auth/drizzle-adapter`, `drizzle-orm`, `drizzle-kit`, `postgres`, `bcryptjs`
- **Base de datos:** PostgreSQL local/VPS — requiere `.env` con `DATABASE_URL`
- **Estructura:** Se poblará `src/app/(dashboard)/` con el layout y las rutas protegidas
- **Seed:** Script `src/shared/lib/db/seed.ts` con usuario super_admin y 3 agentes placeholder
- **Todo lo que venga después** (SPEC-04 en adelante) depende de este foundation
