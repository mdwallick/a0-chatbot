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

/**
 * Check Account Endpoint for Streamlined Linking
 *
 * Called by OAuth server to check if an account exists for the given identity.
 * Expects a JWT assertion with user identity information.
 *
 * @see https://developers.google.com/identity/account-linking/oauth-with-sign-in-linking
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Account Check] Request received")

    const body = await request.json()
    const { assertion, intent } = body

    console.log("[Account Check] Intent:", intent)

    if (!assertion) {
      console.error("[Account Check] No assertion provided")
      return NextResponse.json(
        {
          error: "invalid_request",
          error_description: "Missing assertion parameter",
        },
        { status: 400 }
      )
    }

    // Decode the JWT assertion to get user info
    const claims = decodeJwt(assertion)
    if (!claims || !claims.sub) {
      console.error("[Account Check] Invalid assertion")
      return NextResponse.json(
        {
          error: "invalid_assertion",
          error_description: "Unable to decode assertion or missing sub claim",
        },
        { status: 400 }
      )
    }

    const merchantUserId = claims.sub
    console.log("[Account Check] Checking for merchant user:", merchantUserId)

    // Check if merchant identity is already linked to a chatbot user
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
      console.log("[Account Check] Account found:", existingLink.chatbotUserId)
      return NextResponse.json({
        account_found: true,
        user_id: existingLink.chatbotUserId,
        linked_at: existingLink.linkedAt,
      })
    } else {
      console.log("[Account Check] Account not found")
      return NextResponse.json({
        account_found: false,
      })
    }
  } catch (error) {
    console.error("[Account Check] Error:", error)
    return NextResponse.json(
      {
        error: "server_error",
        error_description: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
