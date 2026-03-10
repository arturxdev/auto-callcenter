"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

interface HeaderProps {
  userName: string | null | undefined
  userEmail: string | null | undefined
}

export function Header({ userName, userEmail }: HeaderProps) {
  return (
    <header className="h-11 border-b border-border px-4 flex items-center justify-between bg-background shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {userName ?? userEmail}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut size={13} strokeWidth={1.5} />
          Salir
        </button>
      </div>
    </header>
  )
}
