import { Chat } from "@/components/chat"
import { auth0 } from "@/lib/auth0"
import { prisma } from "@/lib/prisma"

interface ChatPageProps {
  params: { id: string }
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { id } = params

  const session = await auth0.getSession()
  const userId = session?.user?.sub

  if (!userId) {
    return null // Or redirect to login
  }

  let messages = []

  // Only try to fetch messages if it's not a "new" chat
  if (params.id !== "new") {
    messages = await prisma.message.findMany({
      where: { threadId: params.id },
      orderBy: { createdAt: "asc" },
    })
  }

  return (
    <>
      <Chat key={id} id={id} initialMessages={[]} isReadonly={false} />
    </>
  )
}
