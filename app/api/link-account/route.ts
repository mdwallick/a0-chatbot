import { NextRequest } from "next/server"

import { auth0 } from "@/lib/auth0"
import { IdentityToLink, linkUser } from "@/lib/auth0-mgmt"

export async function GET(request: NextRequest) {
  const session = await auth0.getSession()
  const searchParams = request.nextUrl.searchParams
  const returnTo = searchParams.get("returnTo")!
  const cookie = request.cookies.get("link-account")
  const { strategy, subject } = JSON.parse(cookie?.value || "{}")
  const enabledConnections = JSON.parse(process.env.ENABLED_CONNECTIONS!)

  const identity: IdentityToLink = {
    provider: strategy,
    connection_id: enabledConnections[strategy],
    user_id: session!.user.sub,
  }

  await linkUser(subject, identity)

  request.cookies.delete("link-account")

  return Response.redirect(new URL(`/auth/login?returnTo=${returnTo}`, request.nextUrl.origin))
}
