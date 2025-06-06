"use client"

import { Trash2Icon, PencilIcon, PanelLeftDashed } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { useUser } from "@auth0/nextjs-auth0"
import { useSidebar } from "@/components/sidebar-context"

import { Button } from "./ui/button"
import Link from "next/link"
import { MicrosoftCopilotIcon } from "./icons"

export function ChatSidebar({ isMobileDrawer = false }: { isMobileDrawer?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()

  // Get threads, loading state, and error state from context
  const {
    isSidebarExpanded,
    toggleSidebar,
    createNewChat,
    deleteThread,
    threads,
    isLoadingThreads,
    //threadsError,
  } = useSidebar()

  const showExpandedContent = isMobileDrawer || isSidebarExpanded

  // --- RENDER LOGGED-IN STATE ---
  const currentChatId = pathname?.split("/").pop()

  const sidebarFrameClasses = cn(
    "h-full flex flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-all duration-300",
    isMobileDrawer ? "w-full" : isSidebarExpanded ? "w-64" : "w-24"
  )

  return (
    <div className={sidebarFrameClasses}>
      {/* --- SIDEBAR HEADER SECTION --- */}
      <div className="p-2 h-14">
        {isMobileDrawer ? (
          // --- Mobile Header ---
          <div className="flex items-center justify-between h-full">
            <Button onClick={toggleSidebar} variant="ghost" size="icon" aria-label="Close sidebar">
              <PanelLeftDashed size={20} />
            </Button>
            <div className="flex items-center gap-2">
              {user && (
                <Button
                  onClick={async () => {
                    await createNewChat()
                    toggleSidebar() // Close after creating
                  }}
                  variant="outline"
                  size="icon"
                  aria-label="New chat"
                >
                  <PencilIcon size={16} />
                </Button>
              )}
            </div>
          </div>
        ) : (
          // --- Desktop Header ---
          <div className="flex h-full items-center justify-between">
            {/* Left side - Branding */}
            <div className="flex items-center gap-2 min-w-0">
              {showExpandedContent && (
                <div className="flex items-center gap-2 text-primary">
                  <Link href="/">
                    <MicrosoftCopilotIcon />
                  </Link>
                  <Link href="/">
                    <span className="font-semibold text-lg text-theme">Copilot</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Right side - Hamburger and New Chat */}
            <div className="flex items-center gap-1 flex-1 justify-end">
              <Button
                onClick={toggleSidebar}
                variant="ghost"
                size="icon"
                aria-label="Toggle sidebar"
              >
                <PanelLeftDashed size={20} />
              </Button>
              {user && (
                <Button onClick={createNewChat} variant="outline" size="icon" aria-label="New chat">
                  <PencilIcon size={16} />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. THREAD LIST SECTION */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoadingThreads ? (
          <div className="text-sm text-muted-foreground p-4 text-center">Loading chats...</div>
        ) : threads.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center">
            {" "}
            {showExpandedContent ? "No chats yet." : ""}{" "}
          </div>
        ) : (
          threads.map(thread => (
            <div
              key={thread.id}
              className={cn(
                "group flex items-center justify-between gap-1 rounded-md transition-colors",
                currentChatId === thread.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/50 hover:text-muted-foreground"
              )}
            >
              <button
                onClick={() => {
                  router.push(`/chat/${thread.id}`)
                  if (isMobileDrawer) toggleSidebar()
                }}
                className={cn(
                  "flex items-center gap-2 flex-1 p-2.5 text-sm min-w-0 rounded-md",
                  !showExpandedContent && !isMobileDrawer && "justify-center"
                )}
                title={!showExpandedContent && !isMobileDrawer ? thread.summary : undefined}
              >
                {showExpandedContent && <span className="truncate">{thread.summary}</span>}
              </button>
              {showExpandedContent && (
                <Button
                  onClick={async e => {
                    e.stopPropagation()
                    await deleteThread(thread.id)
                  }}
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity mr-1 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Delete chat"
                >
                  {" "}
                  <Trash2Icon size={16} />{" "}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
