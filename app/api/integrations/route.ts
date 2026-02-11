import { NextRequest, NextResponse } from "next/server"

import { auth0 } from "@/lib/auth0"
import { ConnectionsMetadata } from "@/lib/auth0-ai/connections-metadata"

export async function GET(request: NextRequest) {
  const connection = request.nextUrl.searchParams.get("connection")!
  const metadata = ConnectionsMetadata.find(meta => meta.connection === connection)
  const token = await auth0.getAccessTokenForConnection({
    connection,
  })

  return NextResponse.json({
    ...metadata,
    access_token: token.token,
  })
}
