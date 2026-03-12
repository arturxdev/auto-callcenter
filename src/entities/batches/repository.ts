import { eq } from "drizzle-orm"
import { db } from "@/shared/lib/db"
import { batches } from "@/shared/lib/db/schema"

export const BatchesRepository = {
  async create(userId: string, name: string) {
    const [batch] = await db
      .insert(batches)
      .values({ userId, name })
      .returning()
    return batch
  },

  async updateTotalContacts(batchId: string, count: number) {
    await db
      .update(batches)
      .set({ totalContacts: count })
      .where(eq(batches.id, batchId))
  },

  async getAll() {
    return db.select().from(batches)
  },
}
