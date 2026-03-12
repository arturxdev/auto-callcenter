import { db } from "@/shared/lib/db"
import { dncList } from "@/shared/lib/db/schema"

export const DncRepository = {
  async getPhoneSet() {
    const rows = await db.select({ phone: dncList.phone }).from(dncList)
    return new Set(rows.map((r) => r.phone))
  },

  async insert(phone: string, sourceCallId?: string, reason?: string) {
    await db
      .insert(dncList)
      .values({
        phone,
        sourceCallId: sourceCallId ?? null,
        reason: reason ?? null,
      })
      .onConflictDoNothing({ target: dncList.phone })
  },
}
