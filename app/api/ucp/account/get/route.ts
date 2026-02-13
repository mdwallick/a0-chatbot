import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Decode JWT without verification (for demonstration - production should verify signature)
function decodeJwt(token: string): any {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format")
    }
    const payload = Buffer.from(parts[1], "base64url").toString()
    return JSON.parse(payload)
  } catch (error) {
    console.error("[Account Get] JWT decode error:", error)
    return null
  }
}

// Get Auth0 Management API token using M2M credentials
async function getManagementToken(): Promise<string> {
  console.log("[Account Get] Getting Auth0 Management API token...")

  const domain = process.env.AUTH0_DOMAIN
  const clientId = process.env.AUTH0_CLIENT_ID_MGMT
  const clientSecret = process.env.AUTH0_CLIENT_SECRET_MGMT
  const audience = process.env.AUTH0_AUDIENCE

  if (!domain || !clientId || !clientSecret || !audience) {
    throw new Error("Auth0 Management API credentials not configured")
  }

  const tokenUrl = `https://${domain}/oauth/token`

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: audience,
      grant_type: "client_credentials",
    }),
  })

  console.log("[Account Get] Token response status:", response.status)

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[Account Get] Token request failed:", errorText)
    throw new Error(`Failed to get management token: ${response.statusText}`)
  }

  const data = await response.json()
  console.log("[Account Get] Management API token received")

  return data.access_token
}

// Get user details from Auth0
async function getAuth0User(userId: string): Promise<any | null> {
  console.log("[Account Get] Fetching Auth0 user details for:", userId)

  const token = await getManagementToken()
  const domain = process.env.AUTH0_DOMAIN

  // URL encode the user ID (important for special characters like |)
  const encodedUserId = encodeURIComponent(userId)
  const userUrl = `https://${domain}/api/v2/users/${encodedUserId}`

  console.log("[Account Get] User URL:", userUrl)

  const response = await fetch(userUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  console.log("[Account Get] Get user response status:", response.status, response.statusText)

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[Account Get] Get user failed:", errorText)
    return null
  }

  const user = await response.json()
  console.log("[Account Get] Auth0 user fetched:")
  console.log("  - User ID:", user.user_id)
  console.log("  - Email:", user.email)
  console.log("  - Email verified:", user.email_verified)
  console.log("  - Name:", user.name)
  console.log("  - Picture:", user.picture)
  console.log("  - Last login:", user.last_login)

  return user
}

/**
 * Get Account Endpoint for Streamlined Linking
 *
 * Called by OAuth server to retrieve account information for the given identity.
 * Returns complete account details from Auth0 if the identity link exists.
 *
 * Flow:
 * 1. Find identity link in database by merchant user ID
 * 2. Fetch full user profile from Auth0 using Management API
 * 3. Return complete user information
 *
 * @see https://developers.google.com/identity/account-linking/oauth-with-sign-in-linking
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log("=".repeat(80))
    console.log("[Account Get] ===== REQUEST RECEIVED =====")
    console.log("[Account Get] Timestamp:", new Date().toISOString())

    const body = await request.json()
    const { assertion, intent, access_token } = body

    console.log("[Account Get] Request body:")
    console.log("  - Intent:", intent)
    console.log("  - Assertion present:", !!assertion)
    console.log("  - Access token present:", !!access_token)

    if (!assertion && !access_token) {
      console.error("[Account Get] ❌ ERROR: No assertion or access_token provided")
      return NextResponse.json(
        {
          error: "invalid_request",
          error_description: "Missing assertion or access_token parameter",
        },
        { status: 400 }
      )
    }

    // Decode the JWT assertion or access token to get user info
    console.log("[Account Get] Decoding JWT...")
    const claims = decodeJwt(assertion || access_token)

    if (!claims || !claims.sub) {
      console.error("[Account Get] ❌ ERROR: Invalid token or missing sub claim")
      return NextResponse.json(
        {
          error: "invalid_token",
          error_description: "Unable to decode token or missing sub claim",
        },
        { status: 400 }
      )
    }

    const merchantUserId = claims.sub
    console.log("[Account Get] JWT claims:")
    console.log("  - Merchant user ID:", merchantUserId)
    console.log("  - Email (from JWT):", claims.email)
    console.log("  - Name (from JWT):", claims.name)

    console.log("[Account Get] ===== STEP 1: Find Identity Link =====")
    console.log("[Account Get] Searching database for link...")

    // Get the identity link
    const identityLink = await prisma.merchantIdentityLink.findFirst({
      where: {
        merchantUserId: merchantUserId,
      },
      select: {
        id: true,
        chatbotUserId: true,
        merchantUserId: true,
        linkedAt: true,
        lastRefreshedAt: true,
        // Don't return refresh token
      },
    })

    if (!identityLink) {
      const elapsed = Date.now() - startTime
      console.log("[Account Get] ❌ NOT FOUND: No identity link for merchant user")
      console.log("[Account Get] Processing time:", elapsed, "ms")
      console.log("=".repeat(80))

      return NextResponse.json(
        {
          error: "linking_error",
          error_description: "Account link not found",
        },
        { status: 404 }
      )
    }

    console.log("[Account Get] ✅ Identity link found:")
    console.log("  - Link ID:", identityLink.id)
    console.log("  - Chatbot user ID:", identityLink.chatbotUserId)
    console.log("  - Linked at:", identityLink.linkedAt)

    console.log("[Account Get] ===== STEP 2: Fetch Auth0 User Profile =====")

    // Fetch complete user profile from Auth0
    const auth0User = await getAuth0User(identityLink.chatbotUserId)

    if (!auth0User) {
      console.warn("[Account Get] ⚠️ WARNING: Could not fetch Auth0 user profile")
      console.log("[Account Get] Falling back to JWT claims only")

      // Fallback: Return data from database + JWT claims
      return NextResponse.json({
        user_id: identityLink.chatbotUserId,
        merchant_user_id: identityLink.merchantUserId,
        linked_at: identityLink.linkedAt,
        last_refreshed_at: identityLink.lastRefreshedAt,
        email: claims.email || null,
        name: claims.name || null,
        data_source: "jwt_claims_fallback",
      })
    }

    const elapsed = Date.now() - startTime
    console.log("[Account Get] ✅ SUCCESS: Complete user profile retrieved")
    console.log("[Account Get] Processing time:", elapsed, "ms")
    console.log("=".repeat(80))

    // Return complete account information from Auth0
    return NextResponse.json({
      user_id: auth0User.user_id,
      merchant_user_id: identityLink.merchantUserId,
      email: auth0User.email,
      email_verified: auth0User.email_verified,
      name: auth0User.name,
      picture: auth0User.picture,
      nickname: auth0User.nickname,
      linked_at: identityLink.linkedAt,
      last_refreshed_at: identityLink.lastRefreshedAt,
      last_login: auth0User.last_login,
      created_at: auth0User.created_at,
      data_source: "auth0_management_api",
    })
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error("[Account Get] ❌ EXCEPTION:", error)
    console.error(
      "[Account Get] Error type:",
      error instanceof Error ? error.constructor.name : typeof error
    )
    console.error(
      "[Account Get] Error message:",
      error instanceof Error ? error.message : String(error)
    )
    console.error("[Account Get] Stack trace:", error instanceof Error ? error.stack : "N/A")
    console.error("[Account Get] Processing time before error:", elapsed, "ms")
    console.log("=".repeat(80))

    return NextResponse.json(
      {
        error: "server_error",
        error_description: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
