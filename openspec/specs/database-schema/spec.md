## ADDED Requirements

### Requirement: Schema Drizzle completo
El sistema SHALL tener un schema Drizzle con todas las tablas del sistema definidas en `src/shared/lib/db/schema.ts`. La definición de tablas y relaciones SHALL seguir fielmente el schema documentado en el MSP de Obsidian (`Projects/Bulldog/database.md`), que es la fuente de verdad del modelo de datos.

Las tablas son: `users`, `accounts`, `verificationTokens`, `agents`, `batches`, `contacts`, `calls`, `dncList` y `promptSuggestions`. La tabla `sessions` NO se incluye porque la autenticación usa `strategy: "jwt"`. El schema SHALL estar sincronizado con la base de datos via migraciones de Drizzle Kit.

#### Scenario: Migración inicial exitosa
- **WHEN** se ejecuta `drizzle-kit generate` seguido de `drizzle-kit migrate`
- **THEN** todas las tablas se crean en PostgreSQL sin errores

#### Scenario: Tipos inferidos del schema
- **WHEN** cualquier módulo importa tipos desde `@/shared/lib/db/schema`
- **THEN** los tipos de inserción e inferencia están disponibles con type-safety completo

---

### Requirement: Seed reproducible de datos iniciales
El sistema SHALL incluir un script de seed en `src/shared/lib/db/seed.ts` que cree los datos mínimos necesarios para arrancar el proyecto en desarrollo. El seed SHALL ser idempotente usando `onConflictDoNothing`.

#### Scenario: Seed crea usuario super_admin
- **WHEN** se ejecuta el script de seed con `tsx src/shared/lib/db/seed.ts`
- **THEN** existe un usuario con role `super_admin` y email configurable via env (`SEED_ADMIN_EMAIL`)

#### Scenario: Seed crea usuario admin del cliente
- **WHEN** se ejecuta el script de seed
- **THEN** existe un usuario con role `admin` y email configurable via env (`SEED_CLIENT_EMAIL`)

#### Scenario: Seed crea 3 agentes placeholder
- **WHEN** se ejecuta el script de seed
- **THEN** existen 3 registros en la tabla `agents` con nombres "Agent Alpha", "Agent Beta", "Agent Gamma" y `retellAgentId` ficticios (`placeholder-agent-1`, etc.)

#### Scenario: Seed es idempotente
- **WHEN** se ejecuta el script de seed múltiples veces
- **THEN** no se crean registros duplicados — el seed usa `onConflictDoNothing`

---

### Requirement: Instancia singleton del cliente Drizzle
El sistema SHALL exponer una instancia singleton del cliente Drizzle en `src/shared/lib/db/index.ts` para evitar múltiples conexiones en desarrollo (hot reload de Next.js).

#### Scenario: Importación del cliente Drizzle
- **WHEN** cualquier módulo del proyecto importa el cliente de base de datos
- **THEN** siempre obtiene la misma instancia (singleton via global en development)
