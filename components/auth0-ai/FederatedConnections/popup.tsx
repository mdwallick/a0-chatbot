"use client"

import { useCallback, useEffect, useState } from "react"
import { useUser } from "@auth0/nextjs-auth0"

import { WaitingMessage } from "../util/loader"
import { PromptUserContainer } from "../util/prompt-user-container"
import { FederatedConnectionAuthProps } from "./FederatedConnectionAuthProps"

import { AvailableConnections } from "../../connections"

export function EnsureAPIAccessPopup({
  interrupt: { connection, requiredScopes, resume },
  connectWidget: { icon, title, description, action, containerClassName },
  onFinish,
}: FederatedConnectionAuthProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [loginPopup, setLoginPopup] = useState<Window | null>(null)
  const { user } = useUser()

  // Poll for the login process until the popup is closed
  // or the user is authorized
  useEffect(() => {
    if (!loginPopup) {
      return
    }
    const interval = setInterval(async () => {
      if (loginPopup && loginPopup.closed) {
        setIsLoading(false)
        setLoginPopup(null)
        clearInterval(interval)
        if (typeof onFinish === "function") {
          onFinish()
        } else if (typeof resume === "function") {
          resume()
        }
      }
    }, 1000)
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [loginPopup, onFinish, resume])

  // Open the login popup
  const startLoginPopup = useCallback(async () => {
    const match = AvailableConnections.find((account: any) => account.connection === connection)

    if (!match) {
      throw new Error(`Connection "${connection}" not found in AvailableConnections`)
    }

    const { strategy } = match
    const requested_scopes = requiredScopes.join(",")

    const returnTo = new URL("/api/link-account", window.location.origin)
    returnTo.searchParams.set("returnTo", "/close")
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
    const windowFeatures = "width=800,height=800,status=no,toolbar=no,menubar=no"
    const popup = window.open(url, "_blank", windowFeatures)

    if (!popup) {
      console.error("Popup blocked by the browser")
      return
    } else {
      setLoginPopup(popup)
      setIsLoading(true)
    }
  }, [connection, user, requiredScopes])

  if (isLoading) {
    return <WaitingMessage />
  }

  return (
    <PromptUserContainer
      title={title}
      description={description}
      icon={icon}
      containerClassName={containerClassName}
      action={{
        label: action?.label ?? "Connect",
        onClick: startLoginPopup,
      }}
    />
  )
}
