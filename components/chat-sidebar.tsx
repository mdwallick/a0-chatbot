"use client"

import { PanelLeftDashed, MessageSquareIcon, PencilIcon, Trash2Icon } from "lucide-react"
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
  const [isCollapsed, setIsCollapsed] = useState(false)

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
    <div
      className={cn(
        "h-screen flex flex-col transition-width duration-300 bg-[var(--sidebar)] text-[var(--sidebar-foreground)]",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="p-4">
        <Button
          onClick={() => setIsCollapsed(prev => !prev)}
          className="p-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeftDashed size={20} />
        </Button>

        <Button
          onClick={createNewChat}
          className="justify-start gap-2 cursor-pointer"
          variant="outline"
        >
          <PencilIcon
            size={16}
            className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
          />
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
                "group flex items-center gap-2 mb-1 rounded-lg transition-colors cursor-pointer",
                currentChatId === thread.id
                  ? "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <button
                onClick={() => router.push(`/chat/${thread.id}`)}
                className="flex items-center gap-2 flex-1 p-3 text-sm break-words cursor-pointer"
              >
                <MessageSquareIcon size={18} className="text-gray-500 dark:text-gray-400" />
                {!isCollapsed && thread.summary}
              </button>
              {!isCollapsed && (
                <Button
                  onClick={e => deleteThread(thread.id, e)}
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity mr-2 cursor-pointer"
                >
                  <Trash2Icon
                    size={16}
                    className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                  />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
