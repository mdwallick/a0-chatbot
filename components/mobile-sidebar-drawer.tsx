"use client"

import { useSidebar } from "@/components/sidebar-context"
import { ChatSidebar } from "@/components/chat-sidebar"

export function MobileChatSidebarDrawer() {
  const { isSidebarExpanded, toggleSidebar } = useSidebar()

  if (!isSidebarExpanded) {
    return null
  }

  return (
    // This div is the overlay for mobile, shown/hidden by md:hidden in RootLayout
    // and its content controlled by isSidebarExpanded
    <div className="fixed inset-0 z-40 flex md:hidden">
      {" "}
      {/* Ensure it's only for mobile */}
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={toggleSidebar} // Close sidebar when backdrop is clicked
      ></div>
      {/* Sidebar Content */}
      {/* ChatSidebar will be styled to appear as a drawer */}
      <div className="relative z-50 h-full bg-background">
        {" "}
        {/* Added bg-background or your sidebar bg */}
        {/* Pass isMobileDrawer to allow ChatSidebar to adjust its internal styling if needed */}
        <ChatSidebar isMobileDrawer={true} />
      </div>
    </div>
  )
}
