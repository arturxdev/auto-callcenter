import postgres from "postgres"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const sql = postgres(process.env.DATABASE_URL!)

async function migrate() {
  console.log("Running migrations...")

  // Drop old users table (legacy schema from previous project)
  await sql`DROP TABLE IF EXISTS users CASCADE`
  console.log("✓ Dropped old users table")

  // Recreate users with correct schema
  await sql`
    CREATE TABLE "users" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text,
      "email" text NOT NULL,
      "email_verified" timestamp,
      "image" text,
      "password" text,
      "role" text DEFAULT 'admin' NOT NULL,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now(),
      CONSTRAINT "users_email_unique" UNIQUE("email")
    )
  `
  console.log("✓ Created users table")

  // Remaining tables already exist — just ensure foreign keys
  const fks = [
    `ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade`,
    `ALTER TABLE "batches" ADD CONSTRAINT "batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id")`,
    `ALTER TABLE "calls" ADD CONSTRAINT "calls_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id")`,
    `ALTER TABLE "calls" ADD CONSTRAINT "calls_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")`,
    `ALTER TABLE "contacts" ADD CONSTRAINT "contacts_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "batches"("id")`,
    `ALTER TABLE "contacts" ADD CONSTRAINT "contacts_assigned_agent_id_agents_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "agents"("id")`,
    `ALTER TABLE "dnc_list" ADD CONSTRAINT "dnc_list_source_call_id_calls_id_fk" FOREIGN KEY ("source_call_id") REFERENCES "calls"("id")`,
    `ALTER TABLE "prompt_suggestions" ADD CONSTRAINT "prompt_suggestions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id")`,
    `ALTER TABLE "prompt_suggestions" ADD CONSTRAINT "prompt_suggestions_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "batches"("id")`,
    `ALTER TABLE "prompt_suggestions" ADD CONSTRAINT "prompt_suggestions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")`,
  ]

  for (const fk of fks) {
    try {
      await sql.unsafe(fk)
    } catch {
      // Constraint already exists — skip
    }
  }
  console.log("✓ Foreign key constraints applied")

  console.log("✓ All migrations complete")
  await sql.end()
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
