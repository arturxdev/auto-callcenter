import { and, eq, ilike, or, sql, desc, gte, lte, SQL } from "drizzle-orm"
import { db } from "@/shared/lib/db"
import { calls, agents } from "@/shared/lib/db/schema"

interface CallFilters {
  page?: number
  pageSize?: number
  result?: string
  agentId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

interface UpsertCallData {
  retellCallId?: string | null
  agentId?: string
  contactId?: string | null
  customerName?: string | null
  customerPhone: string
  customerAddress?: string | null
  startedAt?: Date | null
  endedAt?: Date | null
  durationSeconds?: number | null
  result?: string | null
  summary?: string | null
  transcript?: string | null
  audioUrl?: string | null
  cost?: string | null
}

export const CallsRepository = {
  async upsert(data: UpsertCallData) {
    // Try to find existing call by retellCallId or by phone (most recent without retellCallId)
    let existingId: string | null = null

    if (data.retellCallId) {
      const [existing] = await db
        .select({ id: calls.id })
        .from(calls)
        .where(eq(calls.retellCallId, data.retellCallId))
        .limit(1)
      existingId = existing?.id ?? null
    }

    if (!existingId) {
      const [existing] = await db
        .select({ id: calls.id })
        .from(calls)
        .where(eq(calls.customerPhone, data.customerPhone))
        .orderBy(desc(calls.createdAt))
        .limit(1)
      existingId = existing?.id ?? null
    }

    if (existingId) {
      // Update existing — only set non-undefined fields
      const updates: Record<string, unknown> = {}
      if (data.retellCallId !== undefined) updates.retellCallId = data.retellCallId
      if (data.agentId !== undefined) updates.agentId = data.agentId
      if (data.contactId !== undefined) updates.contactId = data.contactId
      if (data.customerName !== undefined) updates.customerName = data.customerName
      if (data.customerAddress !== undefined) updates.customerAddress = data.customerAddress
      if (data.startedAt !== undefined) updates.startedAt = data.startedAt
      if (data.endedAt !== undefined) updates.endedAt = data.endedAt
      if (data.durationSeconds !== undefined) updates.durationSeconds = data.durationSeconds
      if (data.result !== undefined) updates.result = data.result
      if (data.summary !== undefined) updates.summary = data.summary
      if (data.transcript !== undefined) updates.transcript = data.transcript
      if (data.audioUrl !== undefined) updates.audioUrl = data.audioUrl
      if (data.cost !== undefined) updates.cost = data.cost

      if (Object.keys(updates).length > 0) {
        const [updated] = await db
          .update(calls)
          .set(updates)
          .where(eq(calls.id, existingId))
          .returning()
        return updated
      }

      const [existing] = await db
        .select()
        .from(calls)
        .where(eq(calls.id, existingId))
        .limit(1)
      return existing
    }

    // Insert new
    const [inserted] = await db
      .insert(calls)
      .values({
        retellCallId: data.retellCallId ?? null,
        agentId: data.agentId!,
        contactId: data.contactId ?? null,
        customerName: data.customerName ?? null,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress ?? null,
        startedAt: data.startedAt ?? null,
        endedAt: data.endedAt ?? null,
        durationSeconds: data.durationSeconds ?? null,
        result: data.result ?? null,
        summary: data.summary ?? null,
        transcript: data.transcript ?? null,
        audioUrl: data.audioUrl ?? null,
        cost: data.cost ?? null,
      })
      .returning()
    return inserted
  },

  async getMany(filters: CallFilters) {
    const { page = 1, pageSize = 20, result, agentId, dateFrom, dateTo, search } = filters
    const conditions: SQL[] = []

    if (result) conditions.push(eq(calls.result, result))
    if (agentId) conditions.push(eq(calls.agentId, agentId))
    if (dateFrom) conditions.push(gte(calls.createdAt, new Date(dateFrom)))
    if (dateTo) conditions.push(lte(calls.createdAt, new Date(dateTo)))
    if (search) {
      conditions.push(
        or(
          ilike(calls.customerName, `%${search}%`),
          ilike(calls.customerPhone, `%${search}%`)
        )!
      )
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [data, [{ count }]] = await Promise.all([
      db
        .select({
          id: calls.id,
          retellCallId: calls.retellCallId,
          customerName: calls.customerName,
          customerPhone: calls.customerPhone,
          customerAddress: calls.customerAddress,
          startedAt: calls.startedAt,
          endedAt: calls.endedAt,
          durationSeconds: calls.durationSeconds,
          result: calls.result,
          summary: calls.summary,
          cost: calls.cost,
          createdAt: calls.createdAt,
          agentName: agents.name,
          agentId: calls.agentId,
        })
        .from(calls)
        .leftJoin(agents, eq(calls.agentId, agents.id))
        .where(where)
        .orderBy(desc(calls.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(calls)
        .where(where),
    ])

    return { data, total: count }
  },

  async getById(id: string) {
    const [row] = await db
      .select({
        id: calls.id,
        retellCallId: calls.retellCallId,
        customerName: calls.customerName,
        customerPhone: calls.customerPhone,
        customerAddress: calls.customerAddress,
        startedAt: calls.startedAt,
        endedAt: calls.endedAt,
        durationSeconds: calls.durationSeconds,
        result: calls.result,
        summary: calls.summary,
        transcript: calls.transcript,
        audioUrl: calls.audioUrl,
        cost: calls.cost,
        createdAt: calls.createdAt,
        agentName: agents.name,
        agentId: calls.agentId,
      })
      .from(calls)
      .leftJoin(agents, eq(calls.agentId, agents.id))
      .where(eq(calls.id, id))
      .limit(1)
    return row ?? null
  },
}
