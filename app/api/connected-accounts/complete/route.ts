import { NextRequest, NextResponse } from "next/server"

import { auth0 } from "@/lib/auth0"
import { getMyAccountAccessToken, completeConnectedAccount } from "@/lib/auth0-my-account"

/**
 * POST /api/connected-accounts/complete
 * Completes the Connected Accounts flow after user authorization
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession()

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const refreshToken = session.tokenSet.refreshToken
    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token available. Please log in again." },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { auth_session, connect_code, redirect_uri } = body

    if (!auth_session || !connect_code || !redirect_uri) {
      return NextResponse.json(
        { error: "Missing required parameters: auth_session, connect_code, redirect_uri" },
        { status: 400 }
      )
    }

    console.log("[Connected Accounts] Completing connection:", {
      auth_session,
      redirect_uri,
    })

    // Get My Account API access token
    const myAccountToken = await getMyAccountAccessToken(refreshToken)

    // Complete the connected account flow
    const result = await completeConnectedAccount(myAccountToken, {
      authSession: auth_session,
      connectCode: connect_code,
      redirectUri: redirect_uri,
    })

    console.log("[Connected Accounts] Connection completed:", {
      id: result.id,
      connection: result.connection,
      scopes: result.scopes,
    })

    return NextResponse.json({
      success: true,
      connected_account: result,
    })
  } catch (error) {
    console.error("[Connected Accounts] Error completing connection:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete connection" },
      { status: 500 }
    )
  }
}
