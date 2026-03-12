import { Suspense } from "react"
import { AgentsRepository } from "@/entities/agents/repository"
import { BatchesRepository } from "@/entities/batches/repository"
import { ContactFilters } from "@/widgets/contacts/contact-filters"
import { ContactsTable } from "@/widgets/contacts/contacts-table"
import { ImportDialog } from "@/widgets/contacts/import-dialog"

export default async function ContactosPage() {
  const [agents, batches] = await Promise.all([
    AgentsRepository.getAll(),
    BatchesRepository.getAll(),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Contactos</h2>
        <ImportDialog />
      </div>
      <Suspense>
        <ContactFilters
          agents={agents.map((a) => ({ id: a.id, name: a.name }))}
          batches={batches.map((b) => ({ id: b.id, name: b.name }))}
        />
        <ContactsTable />
      </Suspense>
    </div>
  )
}
