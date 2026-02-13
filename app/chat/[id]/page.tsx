import { Chat } from "@/components/chat"
import { auth0 } from "@/lib/auth0"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import type { UIMessage } from "ai"
import { getEnabledProviders } from "@/lib/config/enabled-connections"

const validRoles = ["system", "user", "assistant", "data"] as const

function isValidRole(role: string): role is UIMessage["role"] {
  return validRoles.includes(role as UIMessage["role"])
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { id } = params

  const session = await auth0.getSession()
  const userId = session?.user?.sub

  if (!userId) {
    // Redirect to login or return null
    // return redirect("/api/auth/login")
    return null
  }

  if (id === "new") {
    // Generate new UUID and redirect server-side
    const newId = crypto.randomUUID()
    redirect(`/chat/${newId}`)
  }

  let messages: UIMessage[] = []

  if (id !== "new") {
    const dbMessages = await prisma.message.findMany({
      where: { threadId: id },
      orderBy: { createdAt: "asc" },
    })

    messages = dbMessages
      .filter(msg => isValidRole(msg.role))
      .map(msg => ({
        id: msg.id,
        role: msg.role as UIMessage["role"],
        // Use stored parts if available, otherwise reconstruct from content
        parts: msg.parts ? (msg.parts as any) : [{ type: "text", text: msg.content }],
        content: msg.content,
      }))
  }

  const enabledProviders = getEnabledProviders()

  return (
    <Chat
      key={id}
      id={id}
      initialMessages={messages}
      isReadonly={false}
      enabledProviders={enabledProviders}
    />
  )
}
