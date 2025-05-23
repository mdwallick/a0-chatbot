"use client"

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { generateUUID } from "@/lib/utils"
import { useUser } from "@auth0/nextjs-auth0"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

import type { ChatThread, ThreadsApiResponse } from "@/lib/types"

type SidebarContextType = {
  isSidebarExpanded: boolean
  toggleSidebar: () => void
  createNewChat: () => Promise<void>
  deleteThread: (threadId: string) => Promise<void>
  threads: ChatThread[]
  isLoadingThreads: boolean
  threadsError: any // To expose SWR errors
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

const MOBILE_BREAKPOINT = 768

// SidebarProvider no longer needs the isLoggedIn prop
export function SidebarProvider({ children }: { children: ReactNode }) {
  // 1. Default state to 'false' (closed/collapsed)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  // 2. Use the Auth0 hook
  const { user, isLoading: isUserLoading } = useUser()

  // --- SWR for fetching threads ---
  const SWR_KEY = user ? "/api/chat/threads" : null
  const {
    data: threadsData,
    error: threadsError,
    isLoading: isLoadingSWRThreads,
    mutate: mutateThreads,
  } = useSWR<ThreadsApiResponse>(SWR_KEY, fetcher)

  const threads = threadsData?.threads || []
  const isLoadingThreads = isUserLoading || isLoadingSWRThreads // Consider both user loading and SWR loading

  // 3. useEffect to set the default state based on screen size AND user status
  useEffect(() => {
    // Wait until the user's authentication status is determined
    if (isUserLoading) {
      return
    }

    const isDesktop = window.innerWidth >= MOBILE_BREAKPOINT

    // We only want to automatically set the state for DESKTOP views.
    // Mobile views will default to false (closed) and rely only on user toggle.
    if (isDesktop) {
      // If it's desktop, set expanded based on whether user exists.
      setIsSidebarExpanded(!!user)
    }

    // Important: We don't set it to `false` for mobile here, because this effect runs
    // when login status changes. We don't want a login/logout to force-close an
    // already open mobile drawer. Mobile defaults to false from useState and
    // is then controlled only by `toggleSidebar`.
  }, [user, isUserLoading]) // Re-run when user or loading status changes.

  const toggleSidebar = useCallback(() => {
    setIsSidebarExpanded(prev => !prev)
  }, [])

  const createNewChat = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to create a new chat.")
      return
    }
    const newChatId = generateUUID()
    const tempNewThread = {
      // For optimistic update
      id: newChatId,
      summary: "New conversation",
      updatedAt: new Date().toISOString(),
    }

    // --- Optimistic UI Update ---
    // Immediately update the local SWR cache with the new thread.
    // SWR will show this, then revalidate in the background (if configured).
    mutateThreads(
      currentData => ({
        ...currentData,
        threads: [tempNewThread, ...(currentData?.threads || [])],
      }),
      false // `revalidate` set to false: don't revalidate immediately after optimistic update,
      // let the POST call be the source of truth. The API call below will create the real one.
    )

    try {
      const response = await fetch("/api/chat/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newChatId }), // Send the ID you generated
      })

      if (!response.ok) {
        throw new Error("Failed to create thread on server")
      }
      const actualNewThread = await response.json() // Get the actual thread data from server

      // --- Update with actual server data & Revalidate ---
      // Replace the temporary thread with the actual one and tell SWR the data is fresh.
      mutateThreads(
        currentData => ({
          ...currentData,
          threads: [
            actualNewThread,
            ...(currentData?.threads || []).filter(t => t.id !== tempNewThread.id),
          ],
        }),
        true // Revalidate to ensure consistency, though we just got the truth. Or set to false.
      )

      router.push(`/chat/${newChatId}`)

      if (window.innerWidth < MOBILE_BREAKPOINT && isSidebarExpanded) {
        setIsSidebarExpanded(false)
      }
    } catch (error) {
      toast.error("Failed to create new chat")
      console.error(error)
      // --- Rollback Optimistic Update on Error ---
      mutateThreads(
        currentData => ({
          ...currentData,
          threads: (currentData?.threads || []).filter(t => t.id !== tempNewThread.id),
        }),
        false // Don't revalidate on rollback
      )
    }
  }, [user, router, mutateThreads, isSidebarExpanded])

  // --- NEW deleteThread FUNCTION ---
  const deleteThread = useCallback(
    async (threadId: string) => {
      if (!user) {
        toast.error("Please sign in to delete a thread.")
        return
      }

      // 1. Optimistic Update: Store current data for potential rollback
      const previousThreadsData = threadsData

      // Remove the thread from local SWR cache immediately
      mutateThreads(
        currentData => ({
          ...currentData, // Preserve other potential properties on threadsData
          threads: (currentData?.threads || []).filter(t => t.id !== threadId),
        }),
        false // `revalidate` set to false: We'll handle revalidation based on API response.
      )

      try {
        const response = await fetch(`/api/chat/${threadId}`, {
          method: "DELETE",
          credentials: "include",
        })

        if (!response.ok) {
          // If API call fails, server still has the thread.
          // Rollback the optimistic update by restoring previous data and revalidating.
          toast.error("Failed to delete chat thread from server.")
          if (previousThreadsData) {
            mutateThreads(previousThreadsData, true) // Restore and revalidate
          } else {
            mutateThreads() // Just revalidate if no previous data (shouldn't happen often)
          }
          throw new Error("Failed to delete thread from server")
        }

        toast.success("Chat thread deleted")

        // If we're currently viewing this thread, redirect to home
        if (pathname === `/chat/${threadId}`) {
          router.push("/")
        }
        // Optional: You might revalidate here if you want to be absolutely sure,
        // but if the optimistic update was correct and API succeeded, it's often not needed.
        // mutateThreads();
      } catch (error) {
        console.error("Error deleting thread:", error)
        // If the error wasn't "Failed to delete thread from server" (already handled with toast)
        if (!(error instanceof Error && error.message === "Failed to delete thread from server")) {
          toast.error("An error occurred while deleting the thread.")
        }
        // Ensure state is consistent if an unexpected error occurred after optimistic update
        // This might already be handled by the `if (!response.ok)` block for API errors.
        // If `previousThreadsData` was used for rollback, this might be redundant unless it's a network error.
        // For simplicity, a final revalidation on any catch can be a safe bet if not rolled back yet.
        // However, if the API error occurred, we already triggered a rollback.
      }
    },
    [user, mutateThreads, router, pathname, threadsData]
  ) // Added threadsData for rollback

  return (
    <SidebarContext.Provider
      value={{
        isSidebarExpanded,
        toggleSidebar,
        createNewChat,
        deleteThread,
        threads,
        isLoadingThreads,
        threadsError,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

// "use client"

// import React, { createContext, useContext, useState, ReactNode, useCallback } from "react"
// import { useRouter } from "next/navigation"
// import { toast } from "sonner"
// import { generateUUID } from "@/lib/utils" // Assuming you have this utility

// type SidebarContextType = {
//   isSidebarExpanded: boolean
//   toggleSidebar: () => void
//   createNewChat: () => Promise<void>
// }

// const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

// export function SidebarProvider({ children }: { children: ReactNode }) {
//   const [isSidebarExpanded, setIsSidebarExpanded] = useState(false) // Default to collapsed, or true for expanded
//   const router = useRouter()

//   const toggleSidebar = useCallback(() => {
//     setIsSidebarExpanded(prev => !prev)
//   }, [])

//   const createNewChat = useCallback(async () => {
//     const id = generateUUID()
//     // Note: We can't get `user` from `useUser()` here directly if SidebarProvider
//     // is above where Auth0Provider provides the user.
//     // This logic might need to be slightly adjusted if user info is strictly needed
//     // *before* the API call, or ensure Auth0Provider wraps SidebarProvider.
//     // For now, assuming API endpoint handles user context.

//     try {
//       const response = await fetch("/api/chat/threads", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ id }),
//       })

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}))
//         throw new Error(errorData.error || "Failed to create thread")
//       }

//       // The ChatSidebar listens for "threadListUpdated" to refresh its list.
//       window.dispatchEvent(new CustomEvent("threadListUpdated"))
//       router.push(`/chat/${id}`)
//       // Optionally close the sidebar on mobile after creating a new chat
//       // if (window.innerWidth < 768) { // 768px is md breakpoint
//       //   setIsSidebarExpanded(false);
//       // }
//     } catch (error) {
//       toast.error((error as Error).message || "Failed to create new chat")
//       console.error(error)
//     }
//   }, [router])

//   return (
//     <SidebarContext.Provider value={{ isSidebarExpanded, toggleSidebar, createNewChat }}>
//       {children}
//     </SidebarContext.Provider>
//   )
// }

// export function useSidebar() {
//   const context = useContext(SidebarContext)
//   if (context === undefined) {
//     throw new Error("useSidebar must be used within a SidebarProvider")
//   }
//   return context
// }
