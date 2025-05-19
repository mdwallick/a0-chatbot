"use client"

import { PlusIcon, Trash2Icon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { cn, generateUUID } from "@/lib/utils"
import { useUser } from "@auth0/nextjs-auth0"

import { Button } from "./ui/button"

type ChatThread = {
  id: string
  summary: string
  updatedAt: string
}

export function ChatSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchThreads()

      // Listen for thread updates
      const handleThreadUpdate = () => fetchThreads()
      window.addEventListener("threadListUpdated", handleThreadUpdate)

      return () => {
        window.removeEventListener("threadListUpdated", handleThreadUpdate)
      }
    } else {
      setThreads([])
      setLoading(false)
    }
  }, [user, pathname])

  const fetchThreads = async () => {
    try {
      const response = await fetch("/api/chat/threads")
      const data = await response.json()
      setThreads(data.threads)
    } catch (error) {
      console.error("Error fetching threads:", error)
    } finally {
      setLoading(false)
    }
  }

  const createNewChat = async () => {
    const id = generateUUID()
    if (!user) return

    try {
      const response = await fetch("/api/chat/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        throw new Error("Failed to create thread")
      }

      const newThread = await response.json()

      setThreads(prevThreads => [newThread, ...prevThreads])
      router.push(`/chat/${id}`)
    } catch (error) {
      toast.error("Failed to create new chat")
      console.error(error)
    }
  }
  // const createNewChat = () => {
  //   const id = generateUUID()
  //   if (user) {
  //     setThreads(prevThreads => [
  //       {
  //         id,
  //         summary: "New conversation",
  //         updatedAt: new Date().toISOString(),
  //       },
  //       ...prevThreads,
  //     ])
  //   }
  //   router.push(`/chat/${id}`)
  // }

  const deleteThread = async (threadId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent triggering the thread click
    try {
      const response = await fetch(`/api/chat/${threadId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to delete thread")
      }

      // Remove the thread from the local state
      setThreads(threads => threads.filter(t => t.id !== threadId))

      // If we're currently viewing this thread, redirect to home
      if (pathname === `/chat/${threadId}`) {
        router.push("/")
      }

      toast.success("Chat thread deleted")
    } catch (error) {
      console.error("Error deleting thread:", error)
      toast.error("Failed to delete chat thread")
    }
  }

  if (!user) return null

  const currentChatId = pathname?.split("/").pop()

  return (
    <div className="w-64 border-r border-gray-200 h-screen flex flex-col">
      <div className="p-4">
        <Button onClick={createNewChat} className="w-full justify-start gap-2" variant="outline">
          <PlusIcon size={16} />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-sm text-gray-500 p-4">Loading chats...</div>
        ) : threads.length === 0 ? (
          <div className="text-sm text-gray-500 p-4">No chats yet</div>
        ) : (
          threads.map(thread => (
            <div
              key={thread.id}
              className={cn(
                "group flex items-center gap-2 mb-1",
                "rounded-lg transition-colors",
                currentChatId === thread.id
                  ? "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <button
                onClick={() => router.push(`/chat/${thread.id}`)}
                className="flex-1 text-left p-3 text-sm break-words"
              >
                {thread.summary}
              </button>
              <Button
                onClick={e => deleteThread(thread.id, e)}
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity mr-2 cursor-pointer"
              >
                <Trash2Icon size={16} className="text-gray-500 hover:text-red-500" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
