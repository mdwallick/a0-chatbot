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

/**
 * Get Account Endpoint for Streamlined Linking
 *
 * Called by OAuth server to retrieve account information for the given identity.
 * Returns account details if the identity link exists.
 *
 * @see https://developers.google.com/identity/account-linking/oauth-with-sign-in-linking
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Account Get] Request received")

    const body = await request.json()
    const { assertion, intent, access_token } = body

    console.log("[Account Get] Intent:", intent)

    if (!assertion && !access_token) {
      console.error("[Account Get] No assertion or access_token provided")
      return NextResponse.json(
        {
          error: "invalid_request",
          error_description: "Missing assertion or access_token parameter",
        },
        { status: 400 }
      )
    }

    // Decode the JWT assertion or access token to get user info
    const claims = decodeJwt(assertion || access_token)
    if (!claims || !claims.sub) {
      console.error("[Account Get] Invalid token")
      return NextResponse.json(
        {
          error: "invalid_token",
          error_description: "Unable to decode token or missing sub claim",
        },
        { status: 400 }
      )
    }

    const merchantUserId = claims.sub
    console.log("[Account Get] Retrieving account for merchant user:", merchantUserId)

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
      console.log("[Account Get] Account not found")
      return NextResponse.json(
        {
          error: "linking_error",
          error_description: "Account link not found",
        },
        { status: 404 }
      )
    }

    console.log("[Account Get] Account found:", identityLink.chatbotUserId)

    // Return account information
    return NextResponse.json({
      user_id: identityLink.chatbotUserId,
      merchant_user_id: identityLink.merchantUserId,
      linked_at: identityLink.linkedAt,
      last_refreshed_at: identityLink.lastRefreshedAt,
      email: claims.email || null,
      name: claims.name || null,
    })
  } catch (error) {
    console.error("[Account Get] Error:", error)
    return NextResponse.json(
      {
        error: "server_error",
        error_description: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
