import {
  boolean,
  decimal,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

// ─── Auth.js tables ───────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  password: text("password"), // hashed — credentials provider
  role: text("role").notNull().default("admin"), // super_admin | admin | viewer
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
)

// sessions table intentionally omitted — using JWT strategy (cookie-based)

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
)

// ─── Business tables ──────────────────────────────────────────────────────────

export const agents = pgTable("agents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  retellAgentId: text("retell_agent_id").notNull().unique(),
  name: text("name").notNull(),
  prompt: text("prompt"),
  promptDraft: text("prompt_draft"),
  voice: text("voice"),
  language: text("language").default("en"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const batches = pgTable("batches", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  totalContacts: integer("total_contacts").default(0),
  status: text("status").notNull().default("draft"), // draft | running | completed | paused
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const contacts = pgTable("contacts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  batchId: text("batch_id").references(() => batches.id),
  assignedAgentId: text("assigned_agent_id").references(() => agents.id),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone").notNull(),
  address: text("address"),
  status: text("status").notNull().default("pending"), // pending | called | converted | rejected | dnc | no_answer
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const calls = pgTable("calls", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id),
  contactId: text("contact_id").references(() => contacts.id),
  retellCallId: text("retell_call_id").unique(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds"),
  result: text("result"), // positive | rejected | dnc | no_answer
  processingStatus: text("processing_status").notNull().default("unprocessed"), // unprocessed | processed
  summary: text("summary"),
  transcript: text("transcript"),
  audioUrl: text("audio_url"),
  cost: decimal("cost", { precision: 10, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
})

export const dncList = pgTable("dnc_list", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sourceCallId: text("source_call_id")
    .unique()
    .references(() => calls.id),
  phone: text("phone").notNull().unique(),
  reason: text("reason"),
  addedAt: timestamp("added_at").defaultNow(),
})

export const promptSuggestions = pgTable("prompt_suggestions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id),
  batchId: text("batch_id")
    .notNull()
    .references(() => batches.id),
  reviewedBy: text("reviewed_by").references(() => users.id),
  suggestionText: text("suggestion_text").notNull(),
  status: text("status").notNull().default("pending"), // pending | accepted | rejected | implemented
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
})
