import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"

import { auth0 } from "@/lib/auth0"
import { getMyAccountAccessToken, initiateConnectedAccount } from "@/lib/auth0-my-account"

/**
 * POST /api/connected-accounts/connect
 * Initiates the Connected Accounts flow for Token Vault
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
    const { connection, scopes } = body

    if (!connection || !scopes) {
      return NextResponse.json(
        { error: "Missing required parameters: connection, scopes" },
        { status: 400 }
      )
    }

    // Generate state for CSRF protection
    const state = randomBytes(32).toString("hex")

    // Determine the redirect URI based on the request origin
    // Note: This must be a client-side page because the connect_code is returned in the URL fragment
    const origin = request.headers.get("origin") || request.nextUrl.origin
    const redirectUri = `${origin}/connected-accounts/callback`

    console.log("[Connected Accounts] Initiating connection:", {
      connection,
      scopes,
      redirectUri,
      auth0Domain: process.env.AUTH0_DOMAIN,
    })

    // Get My Account API access token
    const myAccountToken = await getMyAccountAccessToken(refreshToken)
    console.log("[Connected Accounts] Got My Account API token")

    // Initiate the connected account flow
    const result = await initiateConnectedAccount(myAccountToken, {
      connection,
      redirectUri,
      state,
      scopes,
    })

    // Build the full connect URL with ticket if provided
    let fullConnectUri = result.connect_uri
    if (result.connect_params?.ticket) {
      const url = new URL(result.connect_uri)
      url.searchParams.set("ticket", result.connect_params.ticket)
      fullConnectUri = url.toString()
    }

    console.log("[Connected Accounts] Connection initiated:", {
      auth_session: result.auth_session,
      connect_uri: result.connect_uri,
      full_connect_uri: fullConnectUri,
      connect_params: result.connect_params,
      expires_in: result.expires_in,
    })

    // Return the connect_uri and session info to the client
    // The client will redirect to connect_uri and handle the callback
    return NextResponse.json({
      connect_uri: fullConnectUri,
      auth_session: result.auth_session,
      state,
      expires_in: result.expires_in,
      redirect_uri: redirectUri,
    })
  } catch (error) {
    console.error("[Connected Accounts] Error initiating connection:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate connection" },
      { status: 500 }
    )
  }
}
