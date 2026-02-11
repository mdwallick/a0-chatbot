import { NextRequest, NextResponse } from "next/server"

import { auth0 } from "@/lib/auth0"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    console.log("[THREADS API] Request received")
    const session = await auth0.getSession()
    console.log("[THREADS API] Session:", session ? "authenticated" : "unauthenticated")

    if (!session?.user) {
      console.log("[THREADS API] No session, returning 401")
      return new NextResponse("Unauthorized", { status: 401 })
    }

    console.log("[THREADS API] Fetching threads for user:", session.user.sub)
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

    console.log("[THREADS API] Found", threads.length, "threads")
    return NextResponse.json({ threads })
  } catch (error) {
    console.error("[THREADS API] Fatal error:", error)
    return new NextResponse(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
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
