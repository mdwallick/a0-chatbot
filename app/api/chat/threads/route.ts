import { NextRequest, NextResponse } from "next/server"

import { auth0 } from "@/lib/auth0"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth0.getSession()
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const threads = await prisma.chatThread.findMany({
      where: {
        userId: session.user.sub,
      },
      include: {
        messages: {
          take: 3, // Take first 3 messages for better context
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    // Transform threads to include a summary
    const transformedThreads = await Promise.all(
      threads.map(async thread => {
        // If there are no messages, use a default summary
        if (thread.messages.length === 0) {
          return {
            id: thread.id,
            summary: "New conversation",
            updatedAt: thread.updatedAt,
          }
        }

        try {
          // Generate summary using the summarize endpoint
          const response = await fetch(`${request.nextUrl.origin}/api/chat/summarize`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: thread.messages.map(msg => ({
                content: msg.content,
                role: msg.role,
              })),
            }),
          })

          if (!response.ok) {
            throw new Error("Failed to generate summary")
          }

          const data = await response.json()
          return {
            id: thread.id,
            summary: data.summary || "New conversation",
            updatedAt: thread.updatedAt,
          }
        } catch (error) {
          console.error("Error generating summary:", error)
          // Fallback to simple summary if AI summary fails
          const firstMessage = thread.messages[0]?.content || ""
          const words = firstMessage.split(/\s+/)
          const summary =
            words.length > 0
              ? words.slice(0, 5).join(" ") + (words.length > 5 ? "..." : "")
              : "New conversation"

          return {
            id: thread.id,
            summary,
            updatedAt: thread.updatedAt,
          }
        }
      })
    )

    return NextResponse.json({ threads: transformedThreads })
  } catch (error) {
    console.error("Error fetching chat threads:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
