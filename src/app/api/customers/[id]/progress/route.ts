import { NextResponse } from "next/server"
import { getCustomerProgress } from "@/services/customerService"
import { validateUUID } from "@/utils/validateUUID"

type RouteProps = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: Request, { params }: RouteProps) {
  try {
    const { id } = await params
    if (!validateUUID(id)) {
      return NextResponse.json({ error: "Invalid customer id" }, { status: 400 })
    }
    const data = await getCustomerProgress(id, 100)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Operation failed" }, { status: 500 })
  }
}
