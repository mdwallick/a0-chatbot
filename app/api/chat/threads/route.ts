import { NextRequest, NextResponse } from "next/server"

import { auth0 } from "@/lib/auth0"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth0.getSession()
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const threads = await prisma.chatThread.findMany({
      where: {
        userId: session.user.sub,
      },
      select: {
        id: true,
        summary: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    return NextResponse.json({ threads })
  } catch (error) {
    console.error("Error fetching chat threads:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth0.getSession()
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { id } = await request.json()

  if (!id) {
    return new NextResponse("Thread ID is required", { status: 400 })
  }

  try {
    const newThread = await prisma.chatThread.create({
      data: {
        id,
        userId: session.user.sub,
      },
    })

    return NextResponse.json(newThread)
  } catch (error) {
    console.error("Error creating new thread:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
