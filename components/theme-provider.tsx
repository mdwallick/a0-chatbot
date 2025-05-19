"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: "light" | "dark"
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  toggleTheme: () => {},
})

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light")

  // Listen for system theme changes
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const systemTheme = mql.matches ? "dark" : "light"

    const storedTheme = localStorage.getItem("theme") as Theme | null
    const appliedTheme = storedTheme ?? "system"
    setTheme(appliedTheme)
    const resolved = appliedTheme === "system" ? systemTheme : appliedTheme
    setResolvedTheme(resolved)
    document.documentElement.classList.toggle("dark", resolved === "dark")

    const listener = (e: MediaQueryListEvent) => {
      if (theme === "system") {
        const next = e.matches ? "dark" : "light"
        setResolvedTheme(next)
        document.documentElement.classList.toggle("dark", next === "dark")
      }
    }

    mql.addEventListener("change", listener)
    return () => mql.removeEventListener("change", listener)
  }, [theme])

  const toggleTheme = () => {
    let nextTheme: Theme
    if (theme === "light") nextTheme = "dark"
    else if (theme === "dark") nextTheme = "system"
    else nextTheme = "light"

    setTheme(nextTheme)
    localStorage.setItem("theme", nextTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
