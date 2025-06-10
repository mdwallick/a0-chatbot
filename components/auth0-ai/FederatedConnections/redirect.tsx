"use client"

import { useUser } from "@auth0/nextjs-auth0"

import { PromptUserContainer } from "../util/prompt-user-container"
import { FederatedConnectionAuthProps } from "./FederatedConnectionAuthProps"

import { AvailableConnections } from "../../connections"

export function EnsureAPIAccessRedirect({
  interrupt: { requiredScopes, connection },
  connectWidget: { icon, title, description, action, containerClassName },
}: FederatedConnectionAuthProps) {
  const { user } = useUser()

  return (
    <PromptUserContainer
      title={title}
      description={description}
      icon={icon}
      containerClassName={containerClassName}
      action={{
        label: action?.label ?? "Connect",
        onClick: () => {
          const match = AvailableConnections.find(
            (account: any) => account.connection === connection
          )

          if (!match) {
            throw new Error(`Connection "${connection}" not found in AvailableConnections`)
          }

          const { strategy } = match
          const requested_scopes = requiredScopes.join(",")

          const returnTo = new URL("/api/link-account", window.location.origin)
          returnTo.searchParams.set("returnTo", window.location.pathname)
          returnTo.searchParams.set("tx", "link-account")
          returnTo.searchParams.set("tx_strategy", strategy)
          returnTo.searchParams.set("tx_sub", user!.sub)
          returnTo.searchParams.set("connection", connection)
          returnTo.searchParams.set("scopes", requested_scopes)

          const params = new URLSearchParams({
            connection,
            access_type: "offline",
            connection_scope: requested_scopes,
          })

          const url = `/auth/login?${params.toString()}&returnTo=${returnTo}`
          window.location.href = url
        },
      }}
    />
  )
}
