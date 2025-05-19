"use client"

import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Moon, Sun, Laptop } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type Theme = "light" | "dark" | "system"

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system")

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    const initial = stored ?? "system"
    applyTheme(initial)
    setTheme(initial)
  }, [])

  useEffect(() => {
    function updateSystemTheme() {
      if (theme === "system") {
        applyTheme("system")
      }
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    mediaQuery.addEventListener("change", updateSystemTheme)
    return () => mediaQuery.removeEventListener("change", updateSystemTheme)
  }, [theme])

  function applyTheme(theme: Theme) {
    const root = document.documentElement
    if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      if (isDark) root.classList.add("dark")
      else root.classList.remove("dark")
    } else {
      if (theme === "dark") root.classList.add("dark")
      else root.classList.remove("dark")
    }
  }

  function handleChange(theme: Theme) {
    setTheme(theme)
    localStorage.setItem("theme", theme)
    applyTheme(theme)
  }

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="w-4 h-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="w-4 h-4" /> },
    { value: "system", label: "System", icon: <Laptop className="w-4 h-4" /> },
  ]

  const selected = options.find(o => o.value === theme)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          {selected?.icon}
          {selected?.label}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={5}
          className="z-50 min-w-[150px] rounded-md border bg-white dark:bg-gray-900 shadow-md dark:shadow-lg p-1"
        >
          {options.map(opt => (
            <DropdownMenu.Item
              key={opt.value}
              onSelect={() => handleChange(opt.value)}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                theme === opt.value && "font-semibold"
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
