"use client"

import { ChevronRight } from "lucide-react"
import { useCallback } from "react"

import { useUser } from "@auth0/nextjs-auth0"

import { AvailableConnections } from "./connections"

export function EnableIntegration({
  integration,
  title,
  icon,
}: {
  integration: string
  title: string
  icon: React.ReactNode
}) {
  const { user } = useUser()

  const getLinkAccount = useCallback(
    (connection: string) => {
      const match = AvailableConnections.find((account: any) => account.connection === connection)

      if (!match) {
        throw new Error(`Connection "${connection}" not found in AvailableConnections`)
      }

      const { strategy } = match

      if (typeof window === "undefined") {
        return
      }

      const returnToUrl = new URL("/api/link-account", window.location.origin)
      returnToUrl.searchParams.set("returnTo", window.location.href)

      const loginUrl = new URL("/auth/login", window.location.origin)
      loginUrl.searchParams.set("tx", "link-account")
      loginUrl.searchParams.set("tx_strategy", strategy)
      loginUrl.searchParams.set("tx_sub", user!.sub)
      loginUrl.searchParams.set("connection", connection)
      loginUrl.searchParams.set("returnTo", returnToUrl.toString())

      return loginUrl.toString()
    },
    [user]
  )

  return (
    <a
      href={getLinkAccount(integration)}
      className="flex items-center justify-between gap-2 transition-all ease-in hover:cursor-pointer p-4 py-3 pt-3 hover:bg-muted/60 dark:hover:bg-muted/40"
    >
      <div className="flex gap-2 items-center">
        {icon}
        <span className="text-sm text-gray-600 dark:text-gray-300">{title}</span>
      </div>
      <ChevronRight color="#5D5D5D" size={19} />
    </a>
  )
}
