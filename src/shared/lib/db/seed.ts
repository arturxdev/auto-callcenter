import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import bcrypt from "bcryptjs"
import * as dotenv from "dotenv"
import { agents, users } from "./schema"

dotenv.config({ path: ".env.local" })

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)

async function seed() {
  console.log("Seeding database...")

  const adminEmail = process.env.SEED_ADMIN_EMAIL!
  const adminPassword = process.env.SEED_ADMIN_PASSWORD!
  const clientEmail = process.env.SEED_CLIENT_EMAIL!
  const clientPassword = process.env.SEED_CLIENT_PASSWORD!

  // Super admin (Arturo)
  await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 12),
      name: "Arturo",
      role: "super_admin",
    })
    .onConflictDoNothing({ target: users.email })

  console.log(`✓ super_admin: ${adminEmail}`)

  // Admin (Bulldog client)
  await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: clientEmail,
      password: await bcrypt.hash(clientPassword, 12),
      name: "Bulldog Admin",
      role: "admin",
    })
    .onConflictDoNothing({ target: users.email })

  console.log(`✓ admin: ${clientEmail}`)

  // 3 placeholder agents
  const placeholderAgents = [
    { name: "Agent Alpha", retellAgentId: "placeholder-agent-1" },
    { name: "Agent Beta", retellAgentId: "placeholder-agent-2" },
    { name: "Agent Gamma", retellAgentId: "placeholder-agent-3" },
  ]

  for (const agent of placeholderAgents) {
    await db
      .insert(agents)
      .values({
        id: crypto.randomUUID(),
        name: agent.name,
        retellAgentId: agent.retellAgentId,
        language: "en",
        isActive: true,
      })
      .onConflictDoNothing({ target: agents.retellAgentId })

    console.log(`✓ agent: ${agent.name}`)
  }

  console.log("✓ Seed complete")
  await client.end()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
