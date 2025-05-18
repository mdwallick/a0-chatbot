import { NextResponse } from "next/server"

import { auth0 } from "@/lib/auth0"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await auth0.getSession()
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { threadId, message } = await request.json()

  try {
    // Ensure the chat thread exists
    const thread = await prisma.chatThread.upsert({
      where: { id: threadId },
      update: {},
      create: {
        id: threadId,
        userId: session.user.sub,
      },
    })

    // Create the message
    const savedMessage = await prisma.message.create({
      data: {
        content: message.content,
        role: message.role,
        threadId: thread.id,
      },
    })

    // Get latest messages for summary
    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      take: 3,
    })

    // Generate new summary if there are messages
    if (messages.length > 0) {
      const summaryResponse = await fetch(
        `${request.url.split("/api/chat/save")[0]}/api/chat/summarize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messages.map(msg => ({
              content: msg.content,
              role: msg.role,
            })),
          }),
        }
      )

      if (summaryResponse.ok) {
        const { summary } = await summaryResponse.json()
        await prisma.chatThread.update({
          where: { id: threadId },
          data: { summary },
        })
      }
    }

    return NextResponse.json(savedMessage)
  } catch (error) {
    console.error("Error saving message:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
