import { NextResponse } from "next/server"
import { type RetellToolPayload, mapToolCallToDb } from "@/shared/lib/retell"
import { ContactsRepository } from "@/entities/contacts/repository"
import { CallsRepository } from "@/entities/calls/repository"
import { AgentsRepository } from "@/entities/agents/repository"

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RetellToolPayload

    const mapped = mapToolCallToDb(payload)

    // Lookup contact by phone to get assigned agent
    const contact = await ContactsRepository.findByPhone(payload.phone)

    // We need an agentId for inserts — use contact's assigned agent or first active agent
    let agentId = contact?.assignedAgentId
    if (!agentId) {
      const activeAgents = await AgentsRepository.getActive()
      agentId = activeAgents[0]?.id
    }

    if (!agentId) {
      return NextResponse.json(
        { error: "No agent available" },
        { status: 400 }
      )
    }

    const call = await CallsRepository.upsert({
      ...mapped,
      agentId,
      contactId: contact?.id ?? null,
    })

    // Update contact status to converted (tool-call = positive result)
    if (contact) {
      await ContactsRepository.updateStatus(contact.id, "converted")
    }

    return NextResponse.json({ ok: true, callId: call.id })
  } catch (error) {
    console.error("Retell tool webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
