"use client"

import { LogIn, Trash2Icon, PencilIcon, XIcon, Sparkles } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { useUser } from "@auth0/nextjs-auth0"
import { useSidebar } from "@/components/sidebar-context"

import { Button } from "./ui/button"
import Link from "next/link"
import UserButton from "@/components/auth0/user-button"
import ThemeToggle from "./theme-toggle"

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
    "h-full flex flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] border-r border-[var(--border)] transition-all duration-300",
    isMobileDrawer ? "w-full" : isSidebarExpanded ? "w-64" : "w-16"
  )

  return (
    <div className={sidebarFrameClasses}>
      {/* --- SIDEBAR HEADER SECTION --- */}
      <div className="p-2 border-b border-[var(--border)] h-14">
        {isMobileDrawer ? (
          // --- Mobile Header ---
          <div className="flex items-center justify-between h-full">
            <Button onClick={toggleSidebar} variant="ghost" size="icon" aria-label="Close sidebar">
              <XIcon size={20} />
            </Button>
            <div className="flex items-center gap-2">
              <ThemeToggle />
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
            {/* Left side - Branding and New Chat */}
            <div className="flex items-center gap-2 min-w-0">
              {showExpandedContent ? (
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles size={20} className="text-primary flex-shrink-0" />
                  <span className="font-semibold text-lg">Copilot</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Sparkles size={20} className="text-primary" />
                </div>
              )}
            </div>
            
            {/* Right side - Theme Toggle and New Chat */}
            <div className="flex items-center gap-1">
              {!showExpandedContent && <ThemeToggle />}
              {user && (
                <Button
                  onClick={createNewChat}
                  variant="outline"
                  size="icon"
                  aria-label="New chat"
                >
                  <PencilIcon size={16} />
                </Button>
              )}
              {showExpandedContent && <ThemeToggle />}
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

      {/* 3. BOTTOM STUCK CONTENT SECTION */}
      <div
        className={cn(
          "p-2 border-t border-[var(--border)]",
          showExpandedContent ? "space-y-1" : ""
        )}
      >
        <div className="flex items-center justify-between h-full">
          {user ? (
            <UserButton user={user}>
              <a href="/profile" className="flex gap-2 items-center text-sm w-full">
                Profile
              </a>
            </UserButton>
          ) : (
            <Button asChild variant="outline">
              <Link href="/auth/login">
                <LogIn size={16} className="mr-2" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
