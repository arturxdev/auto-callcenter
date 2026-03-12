## Context

Proyecto greenfield — Next.js 16 App Router con FSD ya inicializado pero vacío (solo boilerplate). Es el primer bloque de código real. Necesitamos establecer auth, DB y la cáscara del dashboard antes de implementar cualquier funcionalidad de negocio (SPEC-04 en adelante). Sistema single-tenant para un único cliente (Bulldog Las Vegas).

## Goals / Non-Goals

**Goals:**
- Layout de dashboard funcional con sidebar y navegación entre secciones
- Auth.js v5 con credentials provider (email/password) y sesiones persistidas en Postgres
- Schema Drizzle completo — todas las tablas del sistema aunque solo se usen algunas en este SPEC
- Middleware que protege todas las rutas `/dashboard/*`
- Seed script reproducible para desarrollo local

**Non-Goals:**
- Contenido real en las páginas del dashboard (son placeholders por ahora)
- Lógica de negocio de ningún tipo (batches, llamadas, sugerencias)
- Deploy a producción / configuración de VPS
- Gestión de usuarios desde el UI (CRUD de usuarios)
- Reset de contraseña o flujos de email

## Decisions

### Auth.js v5 con Credentials provider

**Decisión:** Usar `next-auth@beta` con provider `Credentials`, Drizzle Adapter y `strategy: "jwt"`.

**Motivo:** Sistema interno de uso limitado — no necesitamos OAuth. Credentials nos da control total sin depender de Google/GitHub. JWT elimina la necesidad de consultar la base de datos en cada request — el middleware valida el token directamente desde la cookie.

**Alternativas descartadas:**
- Clerk: servicio externo de pago, menos control, dependencia adicional
- Database sessions: requiere query a DB en cada request y tabla `sessions` — innecesario para este sistema interno con pocos usuarios

**Nota técnica:** Con `strategy: "jwt"`, la tabla `sessions` no se necesita en la base de datos. El Drizzle Adapter solo interviene durante el login para hacer lookup del usuario. Los campos `id`, `email` y `role` se añaden al JWT via callback `jwt()` y se exponen via callback `session()`. Las passwords se hashean con `bcryptjs` antes de persistir.

---

### Drizzle sobre Prisma

**Decisión:** Drizzle ORM con `drizzle-kit generate` + `drizzle-kit migrate` para migraciones. Schema definido en `src/shared/lib/db/schema.ts` como TypeScript puro.

**Motivo:** Schema en TypeScript da type-safety end-to-end sin generación de código extra. Las queries son SQL-like y predecibles. Drizzle Adapter de Auth.js está bien mantenido.

**Alternativas descartadas:**
- Prisma: genera código en tiempo de build, requiere CLI separado, schema en lenguaje propio (.prisma)

---

### Route group `(dashboard)` para layout protegido

**Decisión:** Todas las rutas del dashboard viven bajo `src/app/(dashboard)/` con su propio `layout.tsx`. El middleware de Auth.js protege el matcher `/dashboard/:path*`.

**Motivo:** Separa limpiamente las rutas públicas (login) de las protegidas. El layout del dashboard (sidebar + header) se define una sola vez en `(dashboard)/layout.tsx`.

**Estructura de rutas:**
```
src/app/
  (auth)/
    login/page.tsx          # página pública
  (dashboard)/
    layout.tsx              # layout con sidebar — protegido
    dashboard/
      page.tsx              # redirect a /dashboard/llamadas
      llamadas/page.tsx
      contactos/page.tsx
      agentes/page.tsx
      sugerencias/page.tsx
      metricas/page.tsx
```

---

### Roles implementados en session token

**Decisión:** El campo `role` del usuario se expone en el session token via callbacks de Auth.js (`jwt` + `session`). Se consume con `useSession()` o `auth()` según contexto (client/server).

**Motivo:** Evita hacer un fetch adicional a la DB para verificar el rol en cada request. El rol es inmutable para el MVP (no hay UI para cambiarlo), así que el riesgo de datos stale es bajo.

**Roles:**
- `super_admin`: Arturo — acceso total
- `admin`: cliente Bulldog — acceso operativo
- `viewer`: solo lectura (futuro)

---

### Seed con `src/shared/lib/db/seed.ts`

**Decisión:** Script de seed corriendo directamente con `tsx`. Crea: 1 usuario `super_admin` con password configurable via env, y 3 agentes placeholder con IDs de Retell ficticios.

**Motivo:** Permite arrancar el proyecto en desarrollo sin configuración manual. Idempotente — usa `onConflictDoNothing` de Drizzle para no fallar si ya existe.

### Estética Linear con shadcn/ui + Tailwind

**Decisión:** El dashboard tendrá una estética inspirada en [Linear](https://linear.app) — minimalista, densa en información, sin decoración superflua. Se implementa con shadcn/ui (new-york style, ya instalado) y Tailwind CSS v4.

**Principios visuales:**
- Fondo oscuro (`zinc-950` / `zinc-900`) con texto claro
- Sidebar compacto con iconos + labels, sin colores llamativos
- Tipografía pequeña y densa — prioridad a la información, no al espacio en blanco
- Bordes sutiles (`zinc-800`) en lugar de sombras
- Acentos en un solo color (por definir: `indigo` o `violet`)
- Sin gradientes, sin imágenes decorativas, sin animaciones innecesarias

**Referencia visual:**
```
┌─────────────────────────────────────────────┐
│  ● Mission Control          [user] [logout]  │  ← header compacto
├──────────┬──────────────────────────────────┤
│ Llamadas │                                  │
│ Contactos│         página activa            │  ← sidebar angosto
│ Agentes  │                                  │
│Sugerencias                                  │
│ Métricas │                                  │
└──────────┴──────────────────────────────────┘
```

**Componentes shadcn a usar en el shell:**
- `Button`, `Badge` — para acciones y estados
- Sidebar propio (no hay componente sidebar en shadcn) — construido sobre `nav` + `Link` de Next.js

**Motivo:** Linear es el estándar de UI para herramientas internas de productividad — denso, rápido de escanear, sin distracciones. Es la referencia correcta para un mission control operativo.

## Risks / Trade-offs

- **Auth.js v5 en beta** → Puede tener breaking changes. Mitigación: fijar versión exacta en `package.json`, revisar changelog antes de actualizar.
- **Schema completo desde el inicio** → Las tablas de negocio (calls, contacts, etc.) existirán pero vacías. Riesgo bajo — es solo schema, no lógica.
- **bcryptjs en lugar de bcrypt** → bcryptjs es puro JS (más lento) pero no necesita compilación nativa, lo que simplifica el setup. Para el volumen de logins esperado (uso interno) es suficiente.

## Open Questions

~~¿La DB de desarrollo corre local con Docker o se apunta al VPS desde el inicio?~~
**Resuelto:** La base de datos PostgreSQL corre en el VPS desde el inicio — no hay Docker local. El `DATABASE_URL` en `.env.local` apunta directamente al VPS.

~~¿El usuario `admin` del cliente se crea con el seed o se crea manualmente después del deploy?~~
**Resuelto:** El seed crea dos usuarios: `super_admin` (Arturo) y `admin` (cliente Bulldog). Ambos con email y password configurables via variables de entorno (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_CLIENT_EMAIL`, `SEED_CLIENT_PASSWORD`).
