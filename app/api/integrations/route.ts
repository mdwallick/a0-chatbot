import { NextRequest, NextResponse } from "next/server"

import { auth0 } from "@/lib/auth0"
import { ConnectionsMetadata } from "@/lib/auth0-ai/connections-metadata"
import { isConnectionEnabled } from "@/lib/config/enabled-connections"

export async function GET(request: NextRequest) {
  const connection = request.nextUrl.searchParams.get("connection")!

  // Check if this connection is enabled
  if (!isConnectionEnabled(connection)) {
    return NextResponse.json({ error: "Connection not enabled" }, { status: 403 })
  }

  const metadata = ConnectionsMetadata.find(meta => meta.connection === connection)
  const token = await auth0.getAccessTokenForConnection({
    connection,
  })

  return NextResponse.json({
    ...metadata,
    access_token: token.token,
  })
}
