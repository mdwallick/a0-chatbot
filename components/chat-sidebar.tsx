"use client"

import { LogInIcon, MessageSquareIcon, Trash2Icon, XIcon, PencilIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useUser } from "@auth0/nextjs-auth0"
import { useSidebar } from "@/components/sidebar-context"

import UserButton from "@/components/auth0/user-button"
import { Button } from "./ui/button"

type ChatThread = {
  id: string
  summary: string
  updatedAt: string
}

export function ChatSidebar({ isMobileDrawer = false }: { isMobileDrawer?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [loading, setLoading] = useState(true)

  // isSidebarExpanded from context now dictates:
  // - If mobile drawer is open (when isMobileDrawer is true)
  // - If desktop sidebar is in its expanded w-64 state (when isMobileDrawer is false)
  const { isSidebarExpanded, toggleSidebar, createNewChat } = useSidebar()

  // This determines if the sidebar content should show text labels, etc.
  // For mobile drawer, content is always "expanded".
  // For desktop, it depends on the context state.
  const showExpandedContent = isMobileDrawer || isSidebarExpanded

  // Define the classes for the main sidebar frame. This will be used whether logged in or out.
  const sidebarFrameClasses = cn(
    "h-full flex flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] border-r border-[var(--border)] transition-all duration-300",
    isMobileDrawer
      ? "w-full" // Takes full width of its container in MobileChatSidebarDrawer
      : isSidebarExpanded
        ? "w-64"
        : "w-16" // Desktop toggle width
  )

  // --- Logic for logged-out state ---
  if (!user) {
    return (
      <div className={sidebarFrameClasses}>
        {isMobileDrawer && (
          <div className="absolute top-2 right-2 z-10">
            <Button onClick={toggleSidebar} variant="ghost" size="icon" aria-label="Close sidebar">
              <XIcon size={20} />
            </Button>
          </div>
        )}
        <div
          className={cn(
            "flex flex-col flex-1 items-center justify-center p-3 space-y-3",
            // If desktop and collapsed, adjust padding for a single icon button
            !isMobileDrawer && !isSidebarExpanded && "px-2 py-4"
          )}
        >
          <Button
            onClick={() => router.push("/auth/login")} // Adjust to your login path
            variant="outline"
            className={cn(
              "w-full gap-2",
              // If desktop & collapsed, make it an icon-only button
              !isMobileDrawer && !isSidebarExpanded ? "aspect-square p-0 h-auto" : "py-2 px-3"
            )}
            aria-label="Sign In"
          >
            {!isMobileDrawer && !isSidebarExpanded ? (
              <LogInIcon size={18} />
            ) : (
              <>
                <LogInIcon size={16} className="mr-1" />
                Sign In
              </>
            )}
          </Button>
          {(isMobileDrawer || isSidebarExpanded) && ( // Show text only if there's space
            <p className="text-xs text-center text-muted-foreground px-2">
              Sign in to see your chats and manage your account.
            </p>
          )}
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (user) {
      fetchThreads()
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

  const currentChatId = pathname?.split("/").pop()

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] border-r border-[var(--border)] transition-all duration-300",
        isMobileDrawer
          ? "w-full" // Takes full width of its container in MobileChatSidebarDrawer
          : isSidebarExpanded
            ? "w-64"
            : "w-16" // Desktop toggle width
      )}
    >
      {/* Sidebar Header: Adapts for mobile drawer */}
      <div
        className={cn(
          "flex items-center p-2 border-b border-[var(--border)]",
          isMobileDrawer
            ? "justify-between" // Close button on one side, New Chat on other (or stacked)
            : showExpandedContent
              ? "justify-end"
              : "justify-center py-3" // Desktop: only toggle or centered elements
        )}
      >
        {isMobileDrawer && (
          <>
            {/* New Chat Button for Mobile Drawer - Placed in header */}
            <Button
              onClick={async () => {
                await createNewChat()
                toggleSidebar() // Optionally close drawer after new chat
              }}
              variant="ghost" // Or outline
              className="gap-2"
              aria-label="New chat"
            >
              <PencilIcon size={18} />
              <span className="text-sm">New Chat</span>
            </Button>
            <Button
              onClick={toggleSidebar} // Closes the mobile drawer
              variant="ghost"
              size="icon"
              aria-label="Close sidebar"
            >
              <XIcon size={20} />
            </Button>
          </>
        )}
        {/* Desktop: The PanelLeftDashed toggle is now in the main Header component */}
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="text-sm text-muted-foreground p-4 text-center">Loading chats...</div>
        ) : threads.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center">
            {isMobileDrawer ? "" : showExpandedContent ? "No chats yet." : ""}{" "}
            {/* Less verbose when collapsed */}
            {/* On mobile, if no chats, the "New Chat" button above is the primary CTA */}
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
                  if (isMobileDrawer) toggleSidebar() // Close mobile drawer on navigation
                }}
                className={cn(
                  "flex items-center gap-2 flex-1 p-2.5 text-sm min-w-0 rounded-md",
                  !showExpandedContent && !isMobileDrawer && "justify-center" // Center icon when desktop & collapsed
                )}
                title={!showExpandedContent && !isMobileDrawer ? thread.summary : undefined}
              >
                <MessageSquareIcon size={18} className="flex-shrink-0" />
                {/* Always show summary in mobile drawer, or when desktop is expanded */}
                {showExpandedContent && <span className="truncate">{thread.summary}</span>}
              </button>
              {/* Show delete button if content is expanded (either mobile drawer or expanded desktop) */}
              {showExpandedContent && (
                <Button
                  onClick={e => deleteThread(thread.id, e)}
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity mr-1 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Delete chat"
                >
                  <Trash2Icon size={16} />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
      {/* ---- BOTTOM STUCK CONTENT SECTION ---- */}
      {/* This section will be pushed to the bottom because the div above it has flex-1 */}
      {user && ( // Only show this section if the user is logged in, for example
        <div
          className={cn(
            "p-2 border-t border-[var(--border)]",
            isMobileDrawer || isSidebarExpanded ? "space-y-1" : "" // Add spacing only when expanded
          )}
        >
          {/* Example Content: User Info / Logout Button */}
          {isMobileDrawer || isSidebarExpanded ? ( // Show text only when sidebar is expanded or it's a mobile drawer
            <>
              <UserButton user={user}>
                <a href="/profile" className="flex gap-2 items-center text-sm w-full">
                  Profile
                </a>
              </UserButton>
            </>
          ) : (
            // Show only icons when sidebar is collapsed (desktop view)
            <>
              <UserButton user={user}>
                <a href="/profile" className="flex gap-2 items-center text-sm w-full">
                  Profile
                </a>
              </UserButton>
            </>
          )}
          {/* Add other items like a settings link, etc. */}
          {/* <Button variant="ghost" className="w-full justify-start gap-2">
            <SettingsIcon size={16} />
            {(isMobileDrawer || isSidebarExpanded) && <span>Settings</span>}
          </Button> */}
        </div>
      )}
    </div>
  )
}
