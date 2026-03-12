"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog"
import { Input } from "@/shared/ui/input"

interface ImportResult {
  imported: number
  duplicates: number
  dnc: number
  batchId: string
  batchName: string
}

export function ImportDialog() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        body: formData,
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || "Import failed")
      } else {
        setResult(json)
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen && result) {
      router.refresh()
    }
    setOpen(isOpen)
    if (!isOpen) {
      setResult(null)
      setError(null)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm">Importar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar contactos</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <Input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              disabled={loading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleImport} disabled={loading} className="w-full">
              {loading ? "Importando..." : "Importar"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">Importación completada</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Importados:</span>
              <span>{result.imported}</span>
              <span className="text-muted-foreground">Duplicados omitidos:</span>
              <span>{result.duplicates}</span>
              <span className="text-muted-foreground">En lista DNC:</span>
              <span>{result.dnc}</span>
              <span className="text-muted-foreground">Batch:</span>
              <span>{result.batchName}</span>
            </div>
            <Button variant="outline" className="w-full" onClick={() => handleClose(false)}>
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
