import { NextRequest, NextResponse } from "next/server"

import { auth0 } from "@/lib/auth0"
import { getLinkedAccounts } from "@/lib/auth0-mgmt"

export async function GET(request: NextRequest) {
  try {
    const session = await auth0.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const linkedAccounts = await getLinkedAccounts(session.user.sub)
    return NextResponse.json(linkedAccounts)
  } catch (error) {
    console.error("Error fetching linked accounts:", error)
    return NextResponse.json({ error: "Failed to fetch linked accounts" }, { status: 500 })
  }
}
