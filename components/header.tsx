"use client"

import { MenuIcon, XIcon } from "lucide-react" // Keep icons needed
import { useSidebar } from "@/components/sidebar-context"
import { Button } from "@/components/ui/button"

export default function Header() {
  const { isSidebarExpanded, toggleSidebar } = useSidebar()
  const ToggleIcon = isSidebarExpanded ? XIcon : MenuIcon

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4">
      <Button
        size="icon"
        variant="outline"
        onClick={toggleSidebar}
        aria-label={isSidebarExpanded ? "Close sidebar" : "Open sidebar"}
        className="flex-shrink-0"
      >
        <ToggleIcon size={20} />
      </Button>

      {/* Optional: App Title / Breadcrumbs / Other Header Content */}
      <div className="flex-1 text-center font-semibold">Auth0 AI Demo</div>

      {/* Right-aligned items (e.g., User Avatar/Menu if you move it here) */}
      <div className="ml-auto flex items-center gap-2"></div>
    </header>
  )
}
