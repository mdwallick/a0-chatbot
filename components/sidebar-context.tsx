"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { generateUUID } from "@/lib/utils" // Assuming you have this utility

type SidebarContextType = {
  isSidebarExpanded: boolean
  toggleSidebar: () => void
  createNewChat: () => Promise<void>
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false) // Default to collapsed, or true for expanded
  const router = useRouter()

  const toggleSidebar = useCallback(() => {
    setIsSidebarExpanded(prev => !prev)
  }, [])

  const createNewChat = useCallback(async () => {
    const id = generateUUID()
    // Note: We can't get `user` from `useUser()` here directly if SidebarProvider
    // is above where Auth0Provider provides the user.
    // This logic might need to be slightly adjusted if user info is strictly needed
    // *before* the API call, or ensure Auth0Provider wraps SidebarProvider.
    // For now, assuming API endpoint handles user context.

    try {
      const response = await fetch("/api/chat/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to create thread")
      }

      // The ChatSidebar listens for "threadListUpdated" to refresh its list.
      window.dispatchEvent(new CustomEvent("threadListUpdated"))
      router.push(`/chat/${id}`)
      // Optionally close the sidebar on mobile after creating a new chat
      // if (window.innerWidth < 768) { // 768px is md breakpoint
      //   setIsSidebarExpanded(false);
      // }
    } catch (error) {
      toast.error((error as Error).message || "Failed to create new chat")
      console.error(error)
    }
  }, [router])

  return (
    <SidebarContext.Provider value={{ isSidebarExpanded, toggleSidebar, createNewChat }}>
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
