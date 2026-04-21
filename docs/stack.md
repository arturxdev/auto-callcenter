# Stack Técnico — Bulldog Las Vegas

## Resumen

| Capa | Tecnología | Para qué |
|---|---|---|
| Agentes de voz | Retell | Crear, configurar y ejecutar los agentes de voz AI outbound |
| Análisis de llamadas | OpenClaw | Analizar transcripciones y generar sugerencias de mejora al prompt |
| Orquestación | N8N | Conectar Retell → OpenClaw y automatizar workflows |
| Dashboard | Next.js | Mission Control — gestión de contactos, llamadas y sugerencias HITL |
| UI Components | shadcn/ui (new-york) + Tailwind CSS v4 | Componentes y estilos — estética minimalista estilo Linear |
| Autenticación | Auth.js v5 | Login con email/password, JWT sessions, roles |
| ORM | Drizzle ORM | Acceso a base de datos con type-safety y migraciones en TypeScript |
| Base de datos | PostgreSQL | Almacenar llamadas, contactos, sugerencias y configuración de agentes |
| Hosting | VPS | Servidor donde corre la base de datos y N8N |

## Detalle por capa

### Retell
Plataforma principal de agentes de voz AI. Desde aquí se configuran
los 3 agentes (prompt, voz, herramientas), se disparan las llamadas
outbound y se reciben los webhooks con transcripciones al terminar
cada llamada.

### OpenClaw
Motor de análisis de transcripciones. Recibe las llamadas procesadas,
evalúa qué funcionó y qué falló en cada conversación, y genera
sugerencias concretas de mejora para el prompt de cada agente.

### N8N
Orquestador de workflows. Conecta Retell con OpenClaw, maneja los
crons de análisis (12AM) y de aplicación de mejoras, y gestiona
el flujo de datos entre los servicios.

### Next.js — Mission Control
Dashboard interno para gestionar todo el sistema. Funcionalidades:
- Cargar listas de contactos (CSV/Excel)
- Disparar batches de llamadas
- Ver historial y resultados de llamadas
- Revisar y aprobar/rechazar sugerencias de OpenClaw (HITL)
- Ver métricas por agente

### shadcn/ui + Tailwind CSS v4
Componentes de UI y sistema de estilos. Estética inspirada en Linear:
minimalista, densa en información, fondo oscuro (`zinc-950`), bordes sutiles,
sin gradientes ni animaciones decorativas. Componentes instalados en `src/shared/ui/`.

### Auth.js v5
Autenticación del dashboard Mission Control. Provider: email/password
(credentials). Sesiones via JWT en cookie HTTP-only — sin tabla `sessions`
en la base de datos. Roles: `super_admin` / `admin` / `viewer`.

> ~~Clerk~~ — reemplazado por Auth.js v5 para tener control total sobre
> la autenticación sin depender de un servicio externo de pago.

### Drizzle ORM
ORM para acceder a PostgreSQL. Schema definido en TypeScript puro
(`src/shared/lib/db/schema.ts`). Migraciones con `drizzle-kit`.

### PostgreSQL
Base de datos principal. Almacena: agentes, llamadas, contactos,
lista DNC, sugerencias de OpenClaw y su estado (pendiente/aceptada/
rechazada/implementada).

### VPS
Servidor donde viven la base de datos PostgreSQL y la instancia de
N8N. Hosting de la infraestructura propia del sistema.
