import { NextRequest, NextResponse } from "next/server"
import { auth0 } from "@/lib/auth0"
import { prisma } from "@/lib/prisma"

// Decode JWT to extract claims (without verification - we trust tokens from our own Auth0)
function decodeJwt(token: string): any {
  const parts = token.split(".")
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format")
  }
  const payload = Buffer.from(parts[1], "base64url").toString()
  return JSON.parse(payload)
}

// Exchange authorization code for tokens
// Supports streamlined linking with optional intent parameter
async function exchangeCodeForTokens(code: string, redirectUri: string, intent?: string) {
  const idlinkDomain = process.env.MERCHANT_IDLINK_DOMAIN
  const idlinkClientId = process.env.MERCHANT_IDLINK_CLIENT_ID
  const idlinkClientSecret = process.env.MERCHANT_IDLINK_CLIENT_SECRET

  if (!idlinkDomain || !idlinkClientId || !idlinkClientSecret) {
    throw new Error("Identity linking credentials not configured")
  }

  const tokenUrl = `https://${idlinkDomain}/oauth/token`

  console.log("[Identity Linking] Exchanging code for tokens...")
  if (intent) {
    console.log("[Identity Linking] Intent:", intent)
  }

  const requestBody: any = {
    client_id: idlinkClientId,
    client_secret: idlinkClientSecret,
    code: code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  }

  // Include intent for streamlined linking
  if (intent) {
    requestBody.intent = intent
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[Identity Linking] Token exchange failed:", errorText)
    throw new Error(`Token exchange failed: ${response.statusText}`)
  }

  const tokenData = await response.json()
  console.log("[Identity Linking] Tokens received successfully")
  if (tokenData.intent) {
    console.log("[Identity Linking] Response intent:", tokenData.intent)
  }

  return tokenData
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication - user must be signed into chatbot
    const session = await auth0.getSession()
    if (!session?.user?.sub) {
      console.error("[Identity Linking] User not authenticated")
      return NextResponse.redirect(
        new URL(
          "/auth/login?returnTo=" +
            encodeURIComponent("/api/ucp/identity-linking/callback" + request.nextUrl.search),
          request.url
        )
      )
    }

    const chatbotUserId = session.user.sub
    console.log("[Identity Linking] Chatbot user:", chatbotUserId)

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")
    const intent = searchParams.get("intent") // Streamlined linking intent (check/create/get)

    // Handle OAuth errors
    if (error) {
      console.error("[Identity Linking] OAuth error:", error, errorDescription)
      return NextResponse.redirect(
        new URL(
          `/?error=identity_linking_failed&message=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      )
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("[Identity Linking] Missing required parameters")
      return NextResponse.redirect(
        new URL("/?error=identity_linking_failed&message=Missing+required+parameters", request.url)
      )
    }

    // Decode and validate state
    let stateData: { sessionId: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString())
      console.log("[Identity Linking] State decoded:", stateData)

      // Check if state is not too old (5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      if (stateData.timestamp < fiveMinutesAgo) {
        throw new Error("State expired")
      }
    } catch (err) {
      console.error("[Identity Linking] Invalid state:", err)
      return NextResponse.redirect(
        new URL("/?error=identity_linking_failed&message=Invalid+state+parameter", request.url)
      )
    }

    // Exchange authorization code for tokens
    const appBaseUrl = process.env.APP_BASE_URL || process.env.AUTH0_BASE_URL
    const redirectUri = `${appBaseUrl}/api/ucp/identity-linking/callback`

    const tokenData = await exchangeCodeForTokens(code, redirectUri, intent || undefined)

    console.log("[Identity Linking] Tokens received:")
    console.log("- Access token:", tokenData.access_token ? "present" : "missing")
    console.log("- ID token:", tokenData.id_token ? "present" : "missing")
    console.log("- Refresh token:", tokenData.refresh_token ? "present" : "missing")

    // Decode ID token to get merchant user's sub
    if (!tokenData.id_token) {
      throw new Error("No ID token received")
    }

    const idTokenClaims = decodeJwt(tokenData.id_token)
    const merchantUserId = idTokenClaims.sub

    if (!merchantUserId) {
      throw new Error("No sub claim in ID token")
    }

    console.log("[Identity Linking] Merchant user sub:", merchantUserId)

    // Store the identity link in database
    const identityLink = await prisma.merchantIdentityLink.upsert({
      where: {
        chatbotUserId: chatbotUserId,
      },
      update: {
        merchantUserId: merchantUserId,
        refreshToken: tokenData.refresh_token || null,
      },
      create: {
        chatbotUserId: chatbotUserId,
        merchantUserId: merchantUserId,
        refreshToken: tokenData.refresh_token || null,
      },
    })

    console.log("[Identity Linking] Successfully linked identities:")
    console.log("- Chatbot user:", chatbotUserId)
    console.log("- Merchant user:", merchantUserId)
    console.log("- Checkout session:", stateData.sessionId)
    console.log("- Database record ID:", identityLink.id)

    // Redirect to success page
    return NextResponse.redirect(
      new URL(
        `/?success=identity_linked&session=${encodeURIComponent(stateData.sessionId)}`,
        request.url
      )
    )
  } catch (error) {
    console.error("[Identity Linking] Callback error:", error)
    return NextResponse.redirect(
      new URL(
        `/?error=identity_linking_failed&message=${encodeURIComponent(
          error instanceof Error ? error.message : String(error)
        )}`,
        request.url
      )
    )
  }
}
