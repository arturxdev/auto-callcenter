import { auth } from "@/shared/lib/auth"
import { Sidebar } from "@/shared/ui/sidebar"
import { Header } from "@/shared/ui/header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          userName={session?.user?.name}
          userEmail={session?.user?.email}
        />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
