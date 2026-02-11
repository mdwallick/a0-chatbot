import { NextResponse } from "next/server"
import { auth0 } from "@/lib/auth0"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth0.getSession()

    if (!session?.user?.sub) {
      return NextResponse.json(
        {
          linked: false,
          error: "Not authenticated",
        },
        { status: 401 }
      )
    }

    const chatbotUserId = session.user.sub

    const identityLink = await prisma.merchantIdentityLink.findUnique({
      where: {
        chatbotUserId: chatbotUserId,
      },
      select: {
        id: true,
        merchantUserId: true,
        linkedAt: true,
        lastRefreshedAt: true,
        // Don't return refresh token
      },
    })

    if (!identityLink) {
      return NextResponse.json({
        linked: false,
        chatbotUserId: chatbotUserId,
      })
    }

    return NextResponse.json({
      linked: true,
      chatbotUserId: chatbotUserId,
      merchantUserId: identityLink.merchantUserId,
      linkedAt: identityLink.linkedAt,
      lastRefreshedAt: identityLink.lastRefreshedAt,
    })
  } catch (error) {
    console.error("[Identity Linking Status] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to check identity linking status",
      },
      { status: 500 }
    )
  }
}
