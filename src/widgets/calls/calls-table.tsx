"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table"
import { Button } from "@/shared/ui/button"
import { ResultBadge } from "@/shared/ui/result-badge"
import { CallDetailSheet } from "./call-detail-sheet"

interface CallRow {
  id: string
  customerName: string | null
  customerPhone: string
  durationSeconds: number | null
  result: string | null
  createdAt: string | null
  agentName: string | null
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function formatDate(date: string | null) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString()
}

export function CallsTable() {
  const searchParams = useSearchParams() ?? new URLSearchParams()
  const router = useRouter()
  const [data, setData] = useState<CallRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const page = Number(searchParams.get("page")) || 1

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams(searchParams.toString())
    const res = await fetch(`/api/calls?${params}`)
    const json = await res.json()
    setData(json.data ?? [])
    setTotal(json.total ?? 0)
    setLoading(false)
  }, [searchParams.toString()])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalPages = Math.ceil(total / 20)

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(p))
    router.push(`?${params.toString()}`)
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Agente</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No hay llamadas registradas
                </TableCell>
              </TableRow>
            ) : (
              data.map((call) => (
                <TableRow
                  key={call.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedCallId(call.id)
                    setSheetOpen(true)
                  }}
                >
                  <TableCell>{call.customerName || "—"}</TableCell>
                  <TableCell>{call.customerPhone}</TableCell>
                  <TableCell>{call.agentName || "—"}</TableCell>
                  <TableCell>{formatDuration(call.durationSeconds)}</TableCell>
                  <TableCell>
                    <ResultBadge result={call.result} />
                  </TableCell>
                  <TableCell>{formatDate(call.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages} ({total} resultados)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <CallDetailSheet
        callId={selectedCallId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
