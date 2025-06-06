"use client"

import { MenuIcon, Sparkles } from "lucide-react"
import { useSidebar } from "@/components/sidebar-context"
import { Button } from "@/components/ui/button"
import ThemeToggle from "./theme-toggle"

export default function Header() {
  const { isSidebarExpanded, toggleSidebar } = useSidebar()

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <Button
        size="sm"
        variant="ghost"
        onClick={toggleSidebar}
        aria-label={isSidebarExpanded ? "Close sidebar" : "Open sidebar"}
        className="flex-shrink-0 h-8 w-8 p-0 hover:bg-accent"
      >
        <MenuIcon size={16} />
      </Button>

      {/* Copilot branding */}
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles size={20} className="text-primary" />
          <span className="font-semibold text-lg">Copilot</span>
        </div>
      </div>

      {/* Right-aligned items */}
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  )
}
