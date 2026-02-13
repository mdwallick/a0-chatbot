import { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { auth0 } from "@/lib/auth0"
import { IdentityToLink, linkUser } from "@/lib/auth0-mgmt"
import { getConnectionId } from "@/lib/config/enabled-connections"

export async function GET(request: NextRequest) {
  const session = await auth0.getSession()
  const searchParams = request.nextUrl.searchParams
  const returnTo = searchParams.get("returnTo")!
  const cookie = request.cookies.get("link-account")
  const { strategy, subject, connection, scopes } = JSON.parse(cookie?.value || "{}")

  // Use connection name to look up connection ID from ENABLED_CONNECTIONS
  const connectionId = getConnectionId(connection)

  if (!connectionId) {
    console.error(`[link-account] Connection "${connection}" not found in ENABLED_CONNECTIONS`)
    return Response.redirect(
      new URL(
        `/auth/login?returnTo=${returnTo}&error=connection_not_enabled`,
        request.nextUrl.origin
      )
    )
  }

  const skipSet = new Set(["openid", "profile", "email", "address", "phone", "offline_access"])
  for (const scope of scopes) {
    if (skipSet.has(scope)) {
      continue
    }
    await prisma.grantedScope.upsert({
      where: {
        UserConnectionScopeUnique: {
          userId: subject,
          connectionId,
          scope,
        },
      },
      update: {
        grantedAt: new Date(),
      },
      create: {
        userId: subject,
        connectionId,
        scope,
      },
    })
  }

  const identity: IdentityToLink = {
    provider: strategy,
    connection_id: connectionId,
    user_id: session!.user.sub,
  }

  if (subject !== identity.user_id) {
    // only try to link if it's a different identity
    await linkUser(subject, identity)
  }

  request.cookies.delete("link-account")

  return Response.redirect(new URL(`/auth/login?returnTo=${returnTo}`, request.nextUrl.origin))
}
