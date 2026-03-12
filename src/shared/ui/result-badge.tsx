import { Badge } from "@/shared/ui/badge"

const RESULT_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  positive: { label: "Positive", variant: "default", className: "bg-green-600 hover:bg-green-700 text-white" },
  rejected: { label: "Rejected", variant: "destructive", className: "" },
  dnc: { label: "DNC", variant: "default", className: "bg-orange-500 hover:bg-orange-600 text-white" },
  no_answer: { label: "No Answer", variant: "secondary", className: "" },
}

export function ResultBadge({ result }: { result: string | null }) {
  if (!result) return <Badge variant="outline">—</Badge>

  const config = RESULT_CONFIG[result] ?? { label: result, variant: "outline" as const, className: "" }

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}
