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

    return NextResponse.json(savedMessage)
  } catch (error) {
    console.error("Error saving message:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
