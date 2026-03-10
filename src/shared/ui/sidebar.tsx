"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Phone, Users, Bot, Lightbulb, BarChart2 } from "lucide-react"

const navItems = [
  { href: "/llamadas", label: "Llamadas", icon: Phone },
  { href: "/contactos", label: "Contactos", icon: Users },
  { href: "/agentes", label: "Agentes", icon: Bot },
  { href: "/sugerencias", label: "Sugerencias", icon: Lightbulb },
  { href: "/metricas", label: "Métricas", icon: BarChart2 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 shrink-0 h-screen border-r border-border bg-sidebar flex flex-col">
      <div className="px-4 py-4 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Mission Control</span>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname !== null && (pathname === href || pathname.startsWith(href + "/"))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded text-sm transition-colors ${
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <Icon size={14} strokeWidth={1.5} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
