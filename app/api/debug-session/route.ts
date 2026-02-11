import { NextResponse } from "next/server"
import { auth0 } from "@/lib/auth0"

/**
 * Debug endpoint to check if refresh token exists in session
 * Access at: /api/debug-session
 */
export async function GET() {
  const session = await auth0.getSession()

  if (!session) {
    return NextResponse.json({ error: "No session found" }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      sub: session.user.sub,
      email: session.user.email,
      name: session.user.name,
    },
    tokenSet: {
      hasRefreshToken: !!session.tokenSet.refreshToken,
      refreshTokenLength: session.tokenSet.refreshToken?.length || 0,
      accessTokenLength: session.tokenSet.accessToken?.length || 0,
      expiresAt: session.tokenSet.expiresAt,
    },
  })
}
