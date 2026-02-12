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
    console.error("[Account Check] JWT decode error:", error)
    return null
  }
}

// Get Auth0 Management API token using M2M credentials
async function getManagementToken(): Promise<string> {
  console.log("[Account Check] Getting Auth0 Management API token...")

  const domain = process.env.AUTH0_DOMAIN
  const clientId = process.env.AUTH0_CLIENT_ID_MGMT
  const clientSecret = process.env.AUTH0_CLIENT_SECRET_MGMT
  const audience = process.env.AUTH0_AUDIENCE

  console.log("[Account Check] M2M Config:")
  console.log("  - Domain:", domain)
  console.log("  - Client ID:", clientId)
  console.log("  - Audience:", audience)

  if (!domain || !clientId || !clientSecret || !audience) {
    throw new Error("Auth0 Management API credentials not configured")
  }

  const tokenUrl = `https://${domain}/oauth/token`

  console.log("[Account Check] Requesting token from:", tokenUrl)

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

  console.log("[Account Check] Token response status:", response.status, response.statusText)

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[Account Check] Token request failed:", errorText)
    throw new Error(`Failed to get management token: ${response.statusText}`)
  }

  const data = await response.json()
  console.log("[Account Check] Token received successfully")
  console.log("  - Token type:", data.token_type)
  console.log("  - Expires in:", data.expires_in, "seconds")

  return data.access_token
}

// Search for user by email in Auth0 using Lucene query
async function searchUserByEmail(email: string): Promise<any | null> {
  console.log("[Account Check] Searching Auth0 for user with email:", email)

  const token = await getManagementToken()
  const domain = process.env.AUTH0_DOMAIN

  // Lucene query syntax: field:value
  // Escape special characters in email
  const escapedEmail = email.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, "\\$&")
  const luceneQuery = `email:"${escapedEmail}"`

  console.log("[Account Check] Lucene query:", luceneQuery)

  const searchUrl = `https://${domain}/api/v2/users?q=${encodeURIComponent(luceneQuery)}&search_engine=v3`

  console.log("[Account Check] Search URL:", searchUrl)

  const response = await fetch(searchUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  console.log("[Account Check] Search response status:", response.status, response.statusText)

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[Account Check] Search request failed:", errorText)
    throw new Error(`Failed to search users: ${response.statusText}`)
  }

  const users = await response.json()
  console.log("[Account Check] Search returned", users.length, "user(s)")

  if (users.length > 0) {
    const user = users[0]
    console.log("[Account Check] User found:")
    console.log("  - User ID:", user.user_id)
    console.log("  - Email:", user.email)
    console.log("  - Email verified:", user.email_verified)
    console.log("  - Name:", user.name)
    console.log("  - Created at:", user.created_at)
    return user
  } else {
    console.log("[Account Check] No user found with email:", email)
    return null
  }
}

/**
 * Check Account Endpoint for Streamlined Linking
 *
 * Called by OAuth server to check if an account exists for the given identity.
 *
 * Flow:
 * 1. Extract email from JWT assertion (merchant user identity)
 * 2. Search chatbot's Auth0 tenant for user with that email (Lucene query)
 * 3. If found: Return account_found: true with chatbot user ID
 * 4. If not found: Return account_found: false
 *
 * This implements Google's streamlined linking pattern where we check if
 * the merchant user (identified by email) already has an account in the
 * chatbot system before creating a new link.
 *
 * @see https://developers.google.com/identity/account-linking/oauth-with-sign-in-linking
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log("=".repeat(80))
    console.log("[Account Check] ===== REQUEST RECEIVED =====")
    console.log("[Account Check] Timestamp:", new Date().toISOString())
    console.log("[Account Check] Request URL:", request.url)
    console.log("[Account Check] Request method:", request.method)

    const body = await request.json()
    const { assertion, intent } = body

    console.log("[Account Check] Request body:")
    console.log("  - Intent:", intent)
    console.log("  - Assertion present:", !!assertion)
    console.log("  - Assertion length:", assertion?.length)

    if (!assertion) {
      console.error("[Account Check] ❌ ERROR: No assertion provided")
      return NextResponse.json(
        {
          error: "invalid_request",
          error_description: "Missing assertion parameter",
        },
        { status: 400 }
      )
    }

    // Decode the JWT assertion to get user info
    console.log("[Account Check] Decoding JWT assertion...")
    const claims = decodeJwt(assertion)

    if (!claims) {
      console.error("[Account Check] ❌ ERROR: Failed to decode JWT")
      return NextResponse.json(
        {
          error: "invalid_assertion",
          error_description: "Unable to decode assertion",
        },
        { status: 400 }
      )
    }

    console.log("[Account Check] JWT claims decoded:")
    console.log("  - sub:", claims.sub)
    console.log("  - email:", claims.email)
    console.log("  - name:", claims.name)
    console.log("  - iss:", claims.iss)
    console.log("  - aud:", claims.aud)
    console.log("  - exp:", claims.exp, "(expires:", new Date(claims.exp * 1000).toISOString(), ")")

    if (!claims.sub) {
      console.error("[Account Check] ❌ ERROR: Missing sub claim in JWT")
      return NextResponse.json(
        {
          error: "invalid_assertion",
          error_description: "Missing sub claim in assertion",
        },
        { status: 400 }
      )
    }

    if (!claims.email) {
      console.error("[Account Check] ❌ ERROR: Missing email claim in JWT")
      return NextResponse.json(
        {
          error: "invalid_assertion",
          error_description: "Missing email claim in assertion",
        },
        { status: 400 }
      )
    }

    const merchantUserId = claims.sub
    const merchantEmail = claims.email

    console.log("[Account Check] ===== STEP 1: Check Database Link =====")
    console.log("[Account Check] Checking if merchant user already has a link...")
    console.log("  - Merchant user ID:", merchantUserId)

    // First check if there's already a link in our database
    const existingLink = await prisma.merchantIdentityLink.findFirst({
      where: {
        merchantUserId: merchantUserId,
      },
      select: {
        id: true,
        chatbotUserId: true,
        linkedAt: true,
      },
    })

    if (existingLink) {
      const elapsed = Date.now() - startTime
      console.log("[Account Check] ✅ FOUND: Existing link in database")
      console.log("  - Link ID:", existingLink.id)
      console.log("  - Chatbot user ID:", existingLink.chatbotUserId)
      console.log("  - Linked at:", existingLink.linkedAt)
      console.log("[Account Check] Total processing time:", elapsed, "ms")
      console.log("=".repeat(80))

      return NextResponse.json({
        account_found: true,
        user_id: existingLink.chatbotUserId,
        linked_at: existingLink.linkedAt,
        match_method: "database_link",
      })
    }

    console.log("[Account Check] No existing database link found")

    console.log("[Account Check] ===== STEP 2: Search Auth0 by Email =====")
    console.log("[Account Check] Searching chatbot Auth0 tenant for user...")
    console.log("  - Email to search:", merchantEmail)

    // Search Auth0 for a user with this email
    const chatbotUser = await searchUserByEmail(merchantEmail)

    if (chatbotUser) {
      const elapsed = Date.now() - startTime
      console.log("[Account Check] ✅ FOUND: Matching user in chatbot Auth0")
      console.log("  - Chatbot user ID:", chatbotUser.user_id)
      console.log("  - Email:", chatbotUser.email)
      console.log("  - Email verified:", chatbotUser.email_verified)
      console.log("  - Match method: email_lookup")
      console.log("[Account Check] Total processing time:", elapsed, "ms")
      console.log("=".repeat(80))

      return NextResponse.json({
        account_found: true,
        user_id: chatbotUser.user_id,
        email: chatbotUser.email,
        email_verified: chatbotUser.email_verified,
        match_method: "email_lookup",
      })
    }

    const elapsed = Date.now() - startTime
    console.log("[Account Check] ❌ NOT FOUND: No matching account")
    console.log("  - No database link for merchant user:", merchantUserId)
    console.log("  - No Auth0 user with email:", merchantEmail)
    console.log("[Account Check] Total processing time:", elapsed, "ms")
    console.log("=".repeat(80))

    return NextResponse.json({
      account_found: false,
      merchant_user_id: merchantUserId,
      merchant_email: merchantEmail,
    })
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error("[Account Check] ❌ EXCEPTION:", error)
    console.error(
      "[Account Check] Error type:",
      error instanceof Error ? error.constructor.name : typeof error
    )
    console.error(
      "[Account Check] Error message:",
      error instanceof Error ? error.message : String(error)
    )
    console.error("[Account Check] Stack trace:", error instanceof Error ? error.stack : "N/A")
    console.error("[Account Check] Processing time before error:", elapsed, "ms")
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
