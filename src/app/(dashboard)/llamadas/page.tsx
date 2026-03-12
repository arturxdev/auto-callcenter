import { Suspense } from "react"
import { AgentsRepository } from "@/entities/agents/repository"
import { CallFilters } from "@/widgets/calls/call-filters"
import { CallsTable } from "@/widgets/calls/calls-table"

export default async function LlamadasPage() {
  const agents = await AgentsRepository.getAll()

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Llamadas</h2>
      <Suspense>
        <CallFilters agents={agents.map((a) => ({ id: a.id, name: a.name }))} />
        <CallsTable />
      </Suspense>
    </div>
  )
}
