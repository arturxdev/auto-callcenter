"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { Input } from "@/shared/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"

interface Agent {
  id: string
  name: string
}

interface Batch {
  id: string
  name: string
}

interface ContactFiltersProps {
  agents: Agent[]
  batches: Batch[]
}

export function ContactFilters({ agents, batches }: ContactFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams() ?? new URLSearchParams()
  const [search, setSearch] = useState(searchParams.get("search") ?? "")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== "all") {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete("page")
      router.push(`?${params.toString()}`)
    },
    [router, searchParams.toString()]
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateParam("search", search)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, updateParam])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={searchParams.get("batchId") ?? "all"}
        onValueChange={(v) => updateParam("batchId", v)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Batch" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {batches.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("status") ?? "all"}
        onValueChange={(v) => updateParam("status", v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="called">Called</SelectItem>
          <SelectItem value="converted">Converted</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="dnc">DNC</SelectItem>
          <SelectItem value="no_answer">No Answer</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("agentId") ?? "all"}
        onValueChange={(v) => updateParam("agentId", v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Agente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {agents.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        className="w-[200px]"
        placeholder="Buscar nombre o teléfono..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  )
}
