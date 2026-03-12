import { eq } from "drizzle-orm"
import { db } from "@/shared/lib/db"
import { agents } from "@/shared/lib/db/schema"

export const AgentsRepository = {
  async getActive() {
    return db.select().from(agents).where(eq(agents.isActive, true))
  },

  async getByRetellId(retellAgentId: string) {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.retellAgentId, retellAgentId))
      .limit(1)
    return agent ?? null
  },

  async getAll() {
    return db.select().from(agents)
  },
}
