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

/**
 * Create Account Endpoint for Streamlined Linking
 *
 * Called by OAuth server to create a new account link for the given identity.
 * Requires user to be authenticated in the chatbot.
 * Creates a MerchantIdentityLink record.
 *
 * @see https://developers.google.com/identity/account-linking/oauth-with-sign-in-linking
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Account Create] Request received")

    // Require authentication - user must be signed into chatbot
    const session = await auth0.getSession()
    if (!session?.user?.sub) {
      console.error("[Account Create] User not authenticated")
      return NextResponse.json(
        {
          error: "linking_error",
          error_description: "User must be authenticated in chatbot to create account link",
          login_hint: "Sign in to the chatbot first",
        },
        { status: 401 }
      )
    }

    const chatbotUserId = session.user.sub
    console.log("[Account Create] Chatbot user:", chatbotUserId)

    const body = await request.json()
    const { assertion, intent, refresh_token } = body

    console.log("[Account Create] Intent:", intent)

    if (!assertion) {
      console.error("[Account Create] No assertion provided")
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
      console.error("[Account Create] Invalid assertion")
      return NextResponse.json(
        {
          error: "invalid_assertion",
          error_description: "Unable to decode assertion or missing sub claim",
        },
        { status: 400 }
      )
    }

    const merchantUserId = claims.sub
    console.log("[Account Create] Creating link for merchant user:", merchantUserId)

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

    console.log("[Account Create] Successfully created/updated identity link:", identityLink.id)

    // Return success response with user information
    return NextResponse.json({
      success: true,
      user_id: chatbotUserId,
      merchant_user_id: merchantUserId,
      linked_at: identityLink.linkedAt,
      message: "Account link created successfully",
    })
  } catch (error) {
    console.error("[Account Create] Error:", error)
    return NextResponse.json(
      {
        error: "server_error",
        error_description: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
