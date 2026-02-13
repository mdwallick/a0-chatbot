"use server"

import { auth0 } from "@/lib/auth0"
import { deleteUser, getUser } from "@/lib/auth0-mgmt"
import { prisma } from "@/lib/prisma"

export type ExportData = {
  exportedAt: string
  profile: {
    email?: string
    name?: string
    nickname?: string
    picture?: string
    createdAt?: string
  }
  chatHistory: {
    id: string
    summary: string
    createdAt: Date
    messages: {
      id: string
      role: string
      content: string
      createdAt: Date
    }[]
  }[]
  grantedScopes: {
    connectionId: string
    scope: string
    grantedAt: Date
  }[]
}

export async function deleteAccount(): Promise<void> {
  const session = await auth0.getSession()
  if (!session?.user?.sub) {
    throw new Error("Not authenticated")
  }

  const userId = session.user.sub

  // 1. Delete from local database
  // ChatThread cascade deletes Messages automatically due to onDelete: Cascade
  await prisma.chatThread.deleteMany({
    where: { userId },
  })

  // Delete GrantedScope records
  await prisma.grantedScope.deleteMany({
    where: { userId },
  })

  // Delete DailyUsage records
  await prisma.dailyUsage.deleteMany({
    where: { userId },
  })

  // Delete MerchantIdentityLink records
  await prisma.merchantIdentityLink.deleteMany({
    where: { chatbotUserId: userId },
  })

  // Delete XboxCredential if exists
  await prisma.xboxCredential.deleteMany({
    where: { userId },
  })

  // 2. Delete from Auth0
  await deleteUser(userId)
}

export async function exportUserData(): Promise<ExportData> {
  const session = await auth0.getSession()
  if (!session?.user?.sub) {
    throw new Error("Not authenticated")
  }

  const userId = session.user.sub

  // Fetch user profile from Auth0
  const { data: auth0User } = await getUser(userId)

  // Fetch chat history with messages
  const chatThreads = await prisma.chatThread.findMany({
    where: { userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Fetch granted scopes
  const grantedScopes = await prisma.grantedScope.findMany({
    where: { userId },
    select: {
      connectionId: true,
      scope: true,
      grantedAt: true,
    },
  })

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      email: auth0User.email,
      name: auth0User.name,
      nickname: auth0User.nickname,
      picture: auth0User.picture,
      createdAt:
        typeof auth0User.created_at === "string"
          ? auth0User.created_at
          : JSON.stringify(auth0User.created_at),
    },
    chatHistory: chatThreads.map(thread => ({
      id: thread.id,
      summary: thread.summary,
      createdAt: thread.createdAt,
      messages: thread.messages,
    })),
    grantedScopes,
  }
}
