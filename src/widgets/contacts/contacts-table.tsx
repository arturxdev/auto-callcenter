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
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"

interface ContactRow {
  id: string
  firstName: string | null
  lastName: string | null
  phone: string
  status: string
  agentName: string | null
  batchName: string | null
}

const STATUS_COLORS: Record<string, string> = {
  pending: "",
  called: "bg-blue-500 hover:bg-blue-600 text-white",
  converted: "bg-green-600 hover:bg-green-700 text-white",
  rejected: "",
  dnc: "bg-orange-500 hover:bg-orange-600 text-white",
  no_answer: "",
}

export function ContactsTable() {
  const searchParams = useSearchParams() ?? new URLSearchParams()
  const router = useRouter()
  const [data, setData] = useState<ContactRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const page = Number(searchParams.get("page")) || 1

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams(searchParams.toString())
    const res = await fetch(`/api/contacts?${params}`)
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
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Agente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Batch</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No hay contactos. Importa un archivo para empezar.
                </TableCell>
              </TableRow>
            ) : (
              data.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell>{contact.phone}</TableCell>
                  <TableCell>{contact.agentName || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={contact.status === "rejected" || contact.status === "no_answer" ? "secondary" : contact.status === "pending" ? "outline" : "default"}
                      className={STATUS_COLORS[contact.status] ?? ""}
                    >
                      {contact.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{contact.batchName || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
    </>
  )
}
