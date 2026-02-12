import { NextRequest, NextResponse } from "next/server"
import { auth0 } from "@/lib/auth0"
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
    console.error("[Account Create] JWT decode error:", error)
    return null
  }
}

// Get Auth0 Management API token using M2M credentials
async function getManagementToken(): Promise<string> {
  console.log("[Account Create] Getting Auth0 Management API token...")

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

  console.log("[Account Create] Token response status:", response.status, response.statusText)

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[Account Create] Token request failed:", errorText)
    throw new Error(`Failed to get management token: ${response.statusText}`)
  }

  const data = await response.json()
  console.log("[Account Create] Management API token received")

  return data.access_token
}

// Create a new user in Auth0
async function createAuth0User(email: string, name?: string): Promise<any> {
  console.log("[Account Create] Creating new Auth0 user...")
  console.log("  - Email:", email)
  console.log("  - Name:", name)

  const token = await getManagementToken()
  const domain = process.env.AUTH0_DOMAIN

  const createUrl = `https://${domain}/api/v2/users`

  // Generate a random secure password
  const password = generateSecurePassword()

  const userData = {
    email: email,
    email_verified: false, // Will be verified via email
    name: name || email.split("@")[0],
    connection: "Username-Password-Authentication", // Default Auth0 DB connection
    password: password,
    verify_email: true, // Send verification email
  }

  console.log("[Account Create] User data (password hidden):")
  console.log({
    ...userData,
    password: "***HIDDEN***",
  })

  const response = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  })

  console.log("[Account Create] Create user response status:", response.status, response.statusText)

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[Account Create] Create user failed:", errorText)

    // Try to parse error
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.statusCode === 409) {
        // User already exists - this is OK, we can link them
        console.log("[Account Create] User already exists (409), continuing...")
        // Search for the user to get their ID
        const searchUrl = `https://${domain}/api/v2/users?q=${encodeURIComponent(`email:"${email}"`)}&search_engine=v3`
        const searchResponse = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const users = await searchResponse.json()
        if (users.length > 0) {
          return users[0]
        }
      }
    } catch {}

    throw new Error(`Failed to create user: ${response.statusText}`)
  }

  const newUser = await response.json()
  console.log("[Account Create] ✅ User created successfully:")
  console.log("  - User ID:", newUser.user_id)
  console.log("  - Email:", newUser.email)
  console.log("  - Created at:", newUser.created_at)

  return newUser
}

// Generate a secure random password
function generateSecurePassword(): string {
  const length = 32
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = ""
  const crypto = require("crypto")
  const randomBytes = crypto.randomBytes(length)

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length]
  }

  return password
}

/**
 * Create Account Endpoint for Streamlined Linking
 *
 * Called by OAuth server to create a new account link for the given identity.
 *
 * Two scenarios:
 * 1. User is authenticated in chatbot → Link existing chatbot user to merchant
 * 2. User is NOT authenticated → Create NEW Auth0 user and link to merchant
 *
 * This enables true streamlined linking where accounts are created automatically
 * during the OAuth flow without requiring pre-registration.
 *
 * @see https://developers.google.com/identity/account-linking/oauth-with-sign-in-linking
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log("=".repeat(80))
    console.log("[Account Create] ===== REQUEST RECEIVED =====")
    console.log("[Account Create] Timestamp:", new Date().toISOString())

    const body = await request.json()
    const { assertion, intent, refresh_token } = body

    console.log("[Account Create] Request body:")
    console.log("  - Intent:", intent)
    console.log("  - Assertion present:", !!assertion)
    console.log("  - Refresh token present:", !!refresh_token)

    if (!assertion) {
      console.error("[Account Create] ❌ ERROR: No assertion provided")
      return NextResponse.json(
        {
          error: "invalid_request",
          error_description: "Missing assertion parameter",
        },
        { status: 400 }
      )
    }

    // Decode the JWT assertion to get user info
    console.log("[Account Create] Decoding JWT assertion...")
    const claims = decodeJwt(assertion)

    if (!claims) {
      console.error("[Account Create] ❌ ERROR: Failed to decode JWT")
      return NextResponse.json(
        {
          error: "invalid_assertion",
          error_description: "Unable to decode assertion",
        },
        { status: 400 }
      )
    }

    console.log("[Account Create] JWT claims decoded:")
    console.log("  - sub:", claims.sub)
    console.log("  - email:", claims.email)
    console.log("  - name:", claims.name)

    if (!claims.sub || !claims.email) {
      console.error("[Account Create] ❌ ERROR: Missing required claims")
      return NextResponse.json(
        {
          error: "invalid_assertion",
          error_description: "Missing sub or email claim in assertion",
        },
        { status: 400 }
      )
    }

    const merchantUserId = claims.sub
    const merchantEmail = claims.email
    const merchantName = claims.name

    // Check if user is authenticated in chatbot
    const session = await auth0.getSession()
    let chatbotUserId: string

    if (session?.user?.sub) {
      console.log("[Account Create] ===== SCENARIO 1: User Authenticated =====")
      console.log("[Account Create] User is signed into chatbot")
      console.log("  - Chatbot user ID:", session.user.sub)
      console.log("  - Action: Link existing chatbot user to merchant")

      chatbotUserId = session.user.sub
    } else {
      console.log("[Account Create] ===== SCENARIO 2: User NOT Authenticated =====")
      console.log("[Account Create] User is NOT signed into chatbot")
      console.log("  - Action: Create new Auth0 user")

      // Create a new Auth0 user
      const newUser = await createAuth0User(merchantEmail, merchantName)
      chatbotUserId = newUser.user_id

      console.log("[Account Create] New user created:")
      console.log("  - Chatbot user ID:", chatbotUserId)
      console.log("  - Email:", newUser.email)
    }

    console.log("[Account Create] ===== Creating Identity Link =====")
    console.log("  - Chatbot user:", chatbotUserId)
    console.log("  - Merchant user:", merchantUserId)

    // Create the identity link
    const identityLink = await prisma.merchantIdentityLink.upsert({
      where: {
        chatbotUserId: chatbotUserId,
      },
      update: {
        merchantUserId: merchantUserId,
        refreshToken: refresh_token || null,
      },
      create: {
        chatbotUserId: chatbotUserId,
        merchantUserId: merchantUserId,
        refreshToken: refresh_token || null,
      },
    })

    const elapsed = Date.now() - startTime
    console.log("[Account Create] ✅ SUCCESS: Identity link created")
    console.log("  - Link ID:", identityLink.id)
    console.log("  - Linked at:", identityLink.linkedAt)
    console.log("[Account Create] Total processing time:", elapsed, "ms")
    console.log("=".repeat(80))

    // Return success response with user information
    return NextResponse.json({
      success: true,
      user_id: chatbotUserId,
      merchant_user_id: merchantUserId,
      linked_at: identityLink.linkedAt,
      message: "Account link created successfully",
    })
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error("[Account Create] ❌ EXCEPTION:", error)
    console.error("[Account Create] Error type:", error instanceof Error ? error.constructor.name : typeof error)
    console.error("[Account Create] Error message:", error instanceof Error ? error.message : String(error))
    console.error("[Account Create] Stack trace:", error instanceof Error ? error.stack : "N/A")
    console.error("[Account Create] Processing time before error:", elapsed, "ms")
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
