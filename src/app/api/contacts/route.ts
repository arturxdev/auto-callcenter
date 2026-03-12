import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/shared/lib/auth"
import { ContactsRepository } from "@/entities/contacts/repository"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const filters = {
    page: Number(params.get("page")) || 1,
    pageSize: Number(params.get("pageSize")) || 20,
    batchId: params.get("batchId") || undefined,
    status: params.get("status") || undefined,
    agentId: params.get("agentId") || undefined,
    search: params.get("search") || undefined,
  }

  const { data, total } = await ContactsRepository.getMany(filters)
  return NextResponse.json({ data, total })
}
