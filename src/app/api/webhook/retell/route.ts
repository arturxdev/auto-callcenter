import { NextResponse } from "next/server"
import { type RetellPostCallPayload, mapPostCallToDb } from "@/shared/lib/retell"
import { AgentsRepository } from "@/entities/agents/repository"
import { ContactsRepository } from "@/entities/contacts/repository"
import { CallsRepository } from "@/entities/calls/repository"
import { DncRepository } from "@/entities/dnc/repository"

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RetellPostCallPayload

    const mapped = mapPostCallToDb(payload)

    // Lookup agent by Retell agent ID
    const agent = await AgentsRepository.getByRetellId(payload.agent_id)
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found for retell_agent_id" },
        { status: 400 }
      )
    }

    // Lookup contact by phone
    const contact = await ContactsRepository.findByPhone(mapped.customerPhone)

    // Determine result from call_analysis if available
    const result = payload.call_analysis?.custom_analysis_data?.result as string | undefined

    const call = await CallsRepository.upsert({
      ...mapped,
      agentId: agent.id,
      contactId: contact?.id ?? null,
      result: result ?? undefined,
    })

    // Update contact status based on result
    if (contact && result) {
      const statusMap: Record<string, string> = {
        positive: "converted",
        rejected: "rejected",
        dnc: "dnc",
        no_answer: "no_answer",
      }
      const newStatus = statusMap[result]
      if (newStatus) {
        await ContactsRepository.updateStatus(contact.id, newStatus)
      }
    }

    // Auto-insert into DNC if result is dnc
    if (result === "dnc") {
      await DncRepository.insert(
        mapped.customerPhone,
        call.id,
        "Customer requested"
      )
    }

    return NextResponse.json({ ok: true, callId: call.id })
  } catch (error) {
    console.error("Retell webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
