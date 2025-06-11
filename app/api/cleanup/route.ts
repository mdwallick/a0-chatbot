import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn("Unauthorized attempt to access cron job: cleanup")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const messageResult = await prisma.message.deleteMany({
      where: {
        createdAt: {
          lt: yesterday,
        },
      },
    })

    const threadResult = await prisma.chatThread.deleteMany({
      where: {
        createdAt: {
          lt: yesterday,
        },
      },
    })

    const credentialResult = await prisma.xboxCredential.deleteMany({
      where: {
        issuedAt: {
          lt: yesterday,
        },
      },
    })

    const dailyUsageResult = await prisma.dailyUsage.deleteMany({
      where: {
        date: {
          lt: yesterday,
        },
      },
    })

    console.log("Cron job: Deleted old chat logs.")
    console.log(`${messageResult.count} messages deleted`)
    console.log(`${threadResult.count} threads deleted`)
    console.log(`${credentialResult.count} credentials deleted`)
    console.log(`${dailyUsageResult.count} image generation counts deleted`)
    return NextResponse.json({
      message: "Successfully deleted old chat logs.",
    })
  } catch (error) {
    console.error("Cron job: Error deleting old chat logs:", error)
    return NextResponse.json({ error: "Failed to delete old chat logs" }, { status: 500 })
  }
}
