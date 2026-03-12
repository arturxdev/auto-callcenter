"use client"

import { useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet"
import { ScrollArea } from "@/shared/ui/scroll-area"
import { Separator } from "@/shared/ui/separator"
import { ResultBadge } from "@/shared/ui/result-badge"

interface CallDetail {
  id: string
  retellCallId: string | null
  customerName: string | null
  customerPhone: string
  customerAddress: string | null
  startedAt: string | null
  endedAt: string | null
  durationSeconds: number | null
  result: string | null
  summary: string | null
  transcript: string | null
  audioUrl: string | null
  cost: string | null
  createdAt: string | null
  agentName: string | null
}

interface CallDetailSheetProps {
  callId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function formatDate(date: string | null) {
  if (!date) return "—"
  return new Date(date).toLocaleString()
}

export function CallDetailSheet({ callId, open, onOpenChange }: CallDetailSheetProps) {
  const [call, setCall] = useState<CallDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!callId || !open) return
    setLoading(true)
    fetch(`/api/calls/${callId}`)
      .then((r) => r.json())
      .then((data) => setCall(data))
      .finally(() => setLoading(false))
  }, [callId, open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Detalle de llamada</SheetTitle>
        </SheetHeader>

        {loading && <p className="text-sm text-muted-foreground p-4">Cargando...</p>}

        {!loading && call && (
          <ScrollArea className="h-[calc(100vh-80px)] pr-4">
            <div className="space-y-4 py-4">
              {/* Customer info */}
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-muted-foreground uppercase">Cliente</h4>
                <p className="text-sm font-medium">{call.customerName || "Sin nombre"}</p>
                <p className="text-sm text-muted-foreground">{call.customerPhone}</p>
                {call.customerAddress && (
                  <p className="text-sm text-muted-foreground">{call.customerAddress}</p>
                )}
              </div>

              <Separator />

              {/* Call metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Agente</p>
                  <p className="text-sm">{call.agentName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duración</p>
                  <p className="text-sm">{formatDuration(call.durationSeconds)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Resultado</p>
                  <ResultBadge result={call.result} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha</p>
                  <p className="text-sm">{formatDate(call.createdAt)}</p>
                </div>
                {call.cost && (
                  <div>
                    <p className="text-xs text-muted-foreground">Costo</p>
                    <p className="text-sm">${call.cost}</p>
                  </div>
                )}
              </div>

              {/* Summary */}
              {call.summary && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">Resumen</h4>
                    <p className="text-sm">{call.summary}</p>
                  </div>
                </>
              )}

              {/* Transcript */}
              {call.transcript && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">Transcripción</h4>
                    <div className="rounded-md border p-3 max-h-[300px] overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">{call.transcript}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Audio */}
              {call.audioUrl && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">Audio</h4>
                    <audio controls className="w-full" src={call.audioUrl} />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  )
}
