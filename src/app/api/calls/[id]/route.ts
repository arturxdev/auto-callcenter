import { NextResponse } from "next/server"
import { auth } from "@/shared/lib/auth"
import { CallsRepository } from "@/entities/calls/repository"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const call = await CallsRepository.getById(id)
  if (!call) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(call)
}
