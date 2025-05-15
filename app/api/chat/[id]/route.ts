import { NextRequest, NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/prisma";

import type { Prisma } from "@prisma/client"

type Props = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: Props) {
  // Await the params object before using it
  const { id } = await params
  const session = await auth0.getSession()
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const thread = await prisma.chatThread.findUnique({
      where: {
        id,
        userId: session.user.sub, // Ensure user can only access their own threads
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    })

    if (!thread) {
      return NextResponse.json({ messages: [] })
    }

    // Transform messages to match the UI format
    const messages = thread.messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      role: msg.role,
      experimental_attachments: msg.attachments,
    }))

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Error fetching chat:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  const { id } = await params
  const session = await auth0.getSession()
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    // First check if the thread exists and belongs to the user
    const thread = await prisma.chatThread.findUnique({
      where: {
        id,
        userId: session.user.sub,
      },
    })

    if (!thread) {
      return new NextResponse("Thread not found or unauthorized", { status: 404 })
    }

    // Delete the thread and all its messages (cascade delete is handled by Prisma)
    await prisma.chatThread.delete({
      where: {
        id,
        userId: session.user.sub,
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    // Log the full error details
    console.error("Error deleting chat thread:", {
      error,
      threadId: id,
      userId: session.user.sub,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
    })

    // Check for specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes("Could not connect to the database")) {
        return new NextResponse("Database connection error", { status: 503 })
      }
      if (error.message.includes("P2025")) {
        return new NextResponse("Thread not found", { status: 404 })
      }
    }

    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
