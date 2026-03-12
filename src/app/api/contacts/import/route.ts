import { NextResponse } from "next/server"
import { auth } from "@/shared/lib/auth"
import { parseContactsFile } from "@/shared/lib/parse-contacts"
import { AgentsRepository } from "@/entities/agents/repository"
import { BatchesRepository } from "@/entities/batches/repository"
import { ContactsRepository } from "@/entities/contacts/repository"
import { DncRepository } from "@/entities/dnc/repository"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await parseContactsFile(buffer, file.name)

    if (parsed.length === 0) {
      return NextResponse.json(
        { error: "No valid contacts found in file" },
        { status: 400 }
      )
    }

    // Get active agents for round-robin
    const activeAgents = await AgentsRepository.getActive()
    if (activeAgents.length === 0) {
      return NextResponse.json(
        { error: "No active agents available" },
        { status: 400 }
      )
    }

    // Get DNC and existing phone sets for validation
    const [dncPhones, existingPhones] = await Promise.all([
      DncRepository.getPhoneSet(),
      ContactsRepository.getPhoneSet(),
    ])

    // Create batch
    const now = new Date()
    const batchName = `Import ${now.toISOString().slice(0, 16).replace("T", " ")}`
    const batch = await BatchesRepository.create(session.user.id, batchName)

    // Filter duplicates and prepare contacts
    let duplicates = 0
    let dncCount = 0
    const contactsToInsert: {
      batchId: string
      assignedAgentId: string
      firstName: string | null
      lastName: string | null
      phone: string
      address: string | null
      status: string
    }[] = []

    let agentIndex = 0
    for (const contact of parsed) {
      if (existingPhones.has(contact.phone)) {
        duplicates++
        continue
      }

      const isDnc = dncPhones.has(contact.phone)
      if (isDnc) dncCount++

      contactsToInsert.push({
        batchId: batch.id,
        assignedAgentId: activeAgents[agentIndex % activeAgents.length].id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        address: contact.address,
        status: isDnc ? "dnc" : "pending",
      })

      agentIndex++
    }

    // Bulk insert
    await ContactsRepository.bulkInsert(contactsToInsert)

    // Update batch total
    await BatchesRepository.updateTotalContacts(batch.id, contactsToInsert.length)

    return NextResponse.json({
      imported: contactsToInsert.length,
      duplicates,
      dnc: dncCount,
      batchId: batch.id,
      batchName: batch.name,
    })
  } catch (error) {
    console.error("Import error:", error)
    const message = error instanceof Error ? error.message : "Import failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
