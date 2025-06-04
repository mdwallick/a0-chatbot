
"use client"

import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type Theme = "light" | "dark" | "system"

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const resolvedTheme = theme === "system" ? systemTheme : theme

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="w-4 h-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="w-4 h-4" /> },
    { value: "system", label: "System", icon: <Monitor className="w-4 h-4" /> },
  ]

  const selected = options.find(o => o.value === theme)

  if (!mounted) return null

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-border bg-card hover:bg-accent transition-colors h-8">
          {selected?.icon}
          <span className="hidden sm:inline">{selected?.label}</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={5}
          className="z-50 min-w-[140px] rounded-lg border bg-popover shadow-copilot p-1"
        >
          {options.map(opt => (
            <DropdownMenu.Item
              key={opt.value}
              onSelect={() => setTheme(opt.value)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer rounded-md hover:bg-accent transition-colors",
                theme === opt.value && "bg-accent font-medium"
              )}
            >
              {opt.icon}
              {opt.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
