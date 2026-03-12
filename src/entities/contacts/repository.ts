import { and, eq, ilike, or, sql, desc, SQL } from "drizzle-orm"
import { db } from "@/shared/lib/db"
import { contacts, agents, batches } from "@/shared/lib/db/schema"

interface ContactFilters {
  page?: number
  pageSize?: number
  batchId?: string
  status?: string
  agentId?: string
  search?: string
}

export const ContactsRepository = {
  async bulkInsert(
    rows: {
      batchId: string
      assignedAgentId: string
      firstName: string | null
      lastName: string | null
      phone: string
      address: string | null
      status: string
    }[]
  ) {
    if (rows.length === 0) return
    await db.insert(contacts).values(rows)
  },

  async getMany(filters: ContactFilters) {
    const { page = 1, pageSize = 20, batchId, status, agentId, search } = filters
    const conditions: SQL[] = []

    if (batchId) conditions.push(eq(contacts.batchId, batchId))
    if (status) conditions.push(eq(contacts.status, status))
    if (agentId) conditions.push(eq(contacts.assignedAgentId, agentId))
    if (search) {
      conditions.push(
        or(
          ilike(contacts.firstName, `%${search}%`),
          ilike(contacts.lastName, `%${search}%`),
          ilike(contacts.phone, `%${search}%`)
        )!
      )
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [data, [{ count }]] = await Promise.all([
      db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          phone: contacts.phone,
          address: contacts.address,
          status: contacts.status,
          createdAt: contacts.createdAt,
          agentName: agents.name,
          batchName: batches.name,
        })
        .from(contacts)
        .leftJoin(agents, eq(contacts.assignedAgentId, agents.id))
        .leftJoin(batches, eq(contacts.batchId, batches.id))
        .where(where)
        .orderBy(desc(contacts.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(contacts)
        .where(where),
    ])

    return { data, total: count }
  },

  async updateStatus(contactId: string, status: string) {
    await db
      .update(contacts)
      .set({ status, updatedAt: new Date() })
      .where(eq(contacts.id, contactId))
  },

  async getPhoneSet() {
    const rows = await db.select({ phone: contacts.phone }).from(contacts)
    return new Set(rows.map((r) => r.phone))
  },

  async findByPhone(phone: string) {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.phone, phone))
      .limit(1)
    return contact ?? null
  },
}
