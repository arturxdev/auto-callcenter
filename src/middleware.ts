import { auth } from "@/shared/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isDashboard =
    req.nextUrl.pathname.startsWith("/llamadas") ||
    req.nextUrl.pathname.startsWith("/contactos") ||
    req.nextUrl.pathname.startsWith("/agentes") ||
    req.nextUrl.pathname.startsWith("/sugerencias") ||
    req.nextUrl.pathname.startsWith("/metricas")

  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }
})

export const config = {
  matcher: ["/llamadas/:path*", "/contactos/:path*", "/agentes/:path*", "/sugerencias/:path*", "/metricas/:path*"],
}
