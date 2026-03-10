## 1. Dependencias e instalación

- [x] 1.1 Instalar dependencias: `next-auth@beta @auth/drizzle-adapter drizzle-orm drizzle-kit postgres bcryptjs @types/bcryptjs`
- [x] 1.2 Crear archivo `.env.local` con `DATABASE_URL` (apunta al VPS), `AUTH_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_CLIENT_EMAIL`, `SEED_CLIENT_PASSWORD`
- [x] 1.3 Configurar tema oscuro estilo Linear en `src/app/globals.css`: variables CSS de shadcn con fondo `zinc-950`, texto `zinc-100`, bordes `zinc-800` y acento `indigo`

## 2. Base de datos con Drizzle

- [x] 2.1 Crear `src/shared/lib/db/schema.ts` con todas las tablas del sistema — tomar el schema de `Projects/Bulldog/database.md` en Obsidian como fuente de verdad. Tablas: users, accounts, verificationTokens, agents, batches, contacts, calls, dncList, promptSuggestions (sin `sessions` — se usa JWT)
- [x] 2.2 Crear `drizzle.config.ts` en la raíz apuntando al schema y a la carpeta de migraciones
- [x] 2.3 Ejecutar `drizzle-kit generate` para generar los archivos de migración
- [x] 2.4 Ejecutar `drizzle-kit migrate` para aplicar las migraciones a PostgreSQL
- [x] 2.5 Crear singleton del cliente Drizzle en `src/shared/lib/db/index.ts`

## 3. Seed de datos iniciales

- [x] 3.1 Escribir script `src/shared/lib/db/seed.ts` con `onConflictDoNothing` para: usuario `super_admin` (Arturo, desde `SEED_ADMIN_EMAIL/PASSWORD`), usuario `admin` (cliente Bulldog, desde `SEED_CLIENT_EMAIL/PASSWORD`), y 3 agentes placeholder
- [x] 3.2 Agregar script `"db:seed": "tsx src/shared/lib/db/seed.ts"` en `package.json`
- [x] 3.3 Ejecutar `npm run db:seed` y verificar que los datos existen en la base de datos

## 4. Auth.js v5

- [x] 4.1 Crear `src/shared/lib/auth.ts` con configuración de Auth.js: Drizzle Adapter, `session: { strategy: "jwt" }`, Credentials provider con validación de email/password via bcryptjs, callback `jwt` para añadir `id` y `role`, callback `session` para exponerlos
- [x] 4.2 Crear route handler `src/app/api/auth/[...nextauth]/route.ts`
- [x] 4.3 Crear middleware `src/middleware.ts` que proteja todas las rutas `/dashboard/*` y redirija a `/login` si no hay sesión

## 5. Página de login

- [x] 5.1 Crear layout público `src/app/(auth)/layout.tsx` (sin sidebar)
- [x] 5.2 Crear página `src/app/(auth)/login/page.tsx` con formulario email/password
- [x] 5.3 Implementar Server Action o submit handler que llame a `signIn("credentials", ...)` de Auth.js
- [x] 5.4 Mostrar mensaje de error en caso de credenciales incorrectas

## 6. Layout del dashboard

- [x] 6.1 Crear layout `src/app/(dashboard)/layout.tsx` con sidebar y header — obtener sesión con `auth()` para mostrar el usuario
- [x] 6.2 Implementar componente `Sidebar` en `src/shared/ui/sidebar.tsx` con los 5 items de navegación (Llamadas, Contactos, Agentes, Sugerencias, Métricas) usando `usePathname` para marcar el activo
- [x] 6.3 Implementar componente `Header` en `src/shared/ui/header.tsx` con nombre/email del usuario y botón de logout que llama a `signOut()`

## 7. Rutas del dashboard

- [x] 7.1 Crear `src/app/(dashboard)/dashboard/page.tsx` con redirect a `/dashboard/llamadas`
- [x] 7.2 Crear páginas placeholder para cada sección: `llamadas/page.tsx`, `contactos/page.tsx`, `agentes/page.tsx`, `sugerencias/page.tsx`, `metricas/page.tsx`

## 8. Verificación

- [ ] 8.1 Verificar flujo completo: login → dashboard → navegación entre secciones → logout
- [ ] 8.2 Verificar que acceder a `/dashboard/*` sin sesión redirige a `/login`
- [ ] 8.3 Verificar que el `role` está disponible en sesión (console.log en un server component)

<!-- pendiente: ejecutar npm run db:migrate && npm run db:seed manualmente con .env.local configurado -->
