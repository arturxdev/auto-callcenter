# DB Schema — Bulldog Las Vegas (Mission Control)

## Contexto

Sistema single-tenant para Bulldog Las Vegas. 3 agentes AI outbound (Retell) para carpet cleaning. Mission Control es el dashboard Next.js que registra llamadas, gestiona contactos, lista DNC, y tiene el loop de mejora continua vía OpenClaw con HITL.

**Stack:** PostgreSQL en VPS · Drizzle ORM · Auth.js v5 (NextAuth v5) · JWT sessions

---

## Schema Drizzle (`src/shared/lib/db/schema.ts`)

```ts
// Auth.js tables
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  password: text('password'),  // hashed — credentials provider
  role: text('role').notNull().default('admin'), // super_admin | admin | viewer
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const accounts = pgTable('accounts', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })])

// sessions table NOT included — using JWT strategy (cookie-based, no DB lookup)

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires').notNull(),
}, (t) => [primaryKey({ columns: [t.identifier, t.token] })])

// Business tables
export const agents = pgTable('agents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  retellAgentId: text('retell_agent_id').notNull().unique(),
  name: text('name').notNull(),
  prompt: text('prompt'),
  promptDraft: text('prompt_draft'),
  voice: text('voice'),
  language: text('language').default('en'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const batches = pgTable('batches', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  totalContacts: integer('total_contacts').default(0),
  status: text('status').notNull().default('draft'), // draft | running | completed | paused
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const contacts = pgTable('contacts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  batchId: text('batch_id').references(() => batches.id),
  assignedAgentId: text('assigned_agent_id').references(() => agents.id),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone').notNull(),
  address: text('address'),
  status: text('status').notNull().default('pending'), // pending | called | converted | rejected | dnc | no_answer
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const calls = pgTable('calls', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text('agent_id').notNull().references(() => agents.id),
  contactId: text('contact_id').references(() => contacts.id),
  retellCallId: text('retell_call_id').unique(),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone').notNull(),
  customerAddress: text('customer_address'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  durationSeconds: integer('duration_seconds'),
  result: text('result'), // positive | rejected | dnc | no_answer
  processingStatus: text('processing_status').notNull().default('unprocessed'), // unprocessed | processed
  summary: text('summary'),
  transcript: text('transcript'),
  audioUrl: text('audio_url'),
  cost: numeric('cost', { precision: 10, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow(),
})

export const dncList = pgTable('dnc_list', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourceCallId: text('source_call_id').unique().references(() => calls.id),
  phone: text('phone').notNull().unique(),
  reason: text('reason'),
  addedAt: timestamp('added_at').defaultNow(),
})

export const promptSuggestions = pgTable('prompt_suggestions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text('agent_id').notNull().references(() => agents.id),
  batchId: text('batch_id').notNull().references(() => batches.id),
  reviewedBy: text('reviewed_by').references(() => users.id),
  suggestionText: text('suggestion_text').notNull(),
  status: text('status').notNull().default('pending'), // pending | accepted | rejected | implemented
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
})
```

---

## Descripción de Tablas

### `users` + tablas Auth.js
Auth.js v5 maneja autenticación con provider credentials (email/password) y `strategy: "jwt"`.
Las tablas `accounts` y `verificationTokens` son requeridas por el Drizzle Adapter.
La tabla `sessions` **no existe** — las sesiones viven en una cookie JWT HTTP-only.

- `password`: campo adicional para el credentials provider (hash bcrypt)
- `role`: `super_admin` (Arturo) · `admin` (cliente) · `viewer`

### `agents`
Un registro por cada agente configurado en Retell. Sin `userId` — sistema single-tenant.

- `retellAgentId`: ID del agente en Retell (para disparar llamadas y actualizar prompt vía API)
- `prompt`: prompt activo actualmente en Retell
- `promptDraft`: borrador pendiente de publicar (flujo: sugerencia aceptada → draft → publicar → Retell)

### `batches`
Agrupa una carga de contactos. Las sugerencias de OpenClaw se generan por batch completo.

- `status`: `draft` → `running` → `completed` / `paused`

### `contacts`
Lista de contactos cargados para llamadas outbound. Ownership trazada por `batchId → batches.userId`.

- Al importar: se verifica contra `dncList` por teléfono — si existe, status = `dnc`
- `assignedAgentId`: asignado aleatoriamente al cargar el batch

### `calls`
Registro de cada llamada. Viene del webhook/tool call de Retell.

- `processingStatus`: `unprocessed` → OpenClaw analiza → `processed` (Cron 1)
- `result`: asignado al momento de registrar la llamada

### `dncList`
Lista Do Not Call global (single-tenant).

- `phone` unique global
- `sourceCallId`: nullable — si fue agregado manualmente no hay llamada de origen

### `promptSuggestions`
Sugerencias generadas por OpenClaw al completarse un batch.

- Solo se generan cuando `batches.status = 'completed'`
- `status`: `pending` → `accepted` → `implemented` / `rejected`
- `reviewedBy`: quién aprobó o rechazó en el HITL

---

## Máquinas de Estado

### `calls.processingStatus`
```
unprocessed ──(Cron 1: OpenClaw)──► processed
```

### `calls.result`
```
positive | rejected | dnc | no_answer
```

### `contacts.status`
```
pending → called → converted | rejected | dnc | no_answer
```

### `batches.status`
```
draft → running → completed | paused
```

### `promptSuggestions.status`
```
pending → accepted → implemented
       → rejected
```

---

## Decisiones de Diseño

| Decisión | Motivo |
|----------|--------|
| Drizzle ORM | Schema en TypeScript puro, type-safety sin generación de código, migraciones con drizzle-kit |
| Auth.js v5 en lugar de Clerk | Control total sobre auth sin dependencia de servicio externo |
| JWT sessions (`strategy: "jwt"`) | Sin query a DB en cada request — cookie HTTP-only firmada. Tabla `sessions` eliminada |
| Provider credentials (email/password) | Sin OAuth externo por ahora — más simple para el MVP |
| `agents` sin `userId` | Sistema single-tenant, no SaaS |
| `contacts` sin `userId` | Ownership trazada por `batch → user` |
| `dncList` global | DNC universal para el cliente |
| `promptSuggestions` con `batchId` | Sugerencias solo al completar un batch |
| Sin tabla `suggestion_calls` | El contexto de llamadas se recupera por `batchId + agentId` |
