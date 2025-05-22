"use client"

import React, { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { useUser } from "@auth0/nextjs-auth0"

import { ConnectionsMetadata } from "@/lib/auth0-ai/connections"

function Spinner() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
    </svg>
  )
}

type Account = {
  icon: React.ReactNode
  strategy: string
  connection: string
  displayName: string
  description?: string
}

type ConnectedAccount = {
  provider: string
  connection: string
  isPrimary: boolean
}

type UserConnectedAccountsProps = {
  availableAccounts: Account[]
  connectedAccounts?: ConnectedAccount[] | undefined
  allowLink?: boolean
  onFetch: () => Promise<ConnectedAccount[]>
  onUnlink?: (connection: string) => Promise<void>
}

export default function ConnectedAccounts({
  availableAccounts,
  connectedAccounts,
  allowLink,
  onFetch,
  onUnlink,
}: UserConnectedAccountsProps) {
  const { toast } = useToast()
  const { user } = useUser()

  const [currentConnectedAccounts, setCurrentConnectedAccounts] = useState(connectedAccounts)
  const [fetching, setFetching] = useState(false)
  const [isLinkingAccount, setIsLinkingAccount] = useState<string | null>(null)
  const [isUnlinkingAccount, setIsUnlinkingAccount] = useState<string | null>(null)

  const handleFetchConnectedAccounts = useCallback(
    async function handleFetchSessions() {
      setFetching(true)

      try {
        const connectedAccounts = await onFetch()
        setCurrentConnectedAccounts(connectedAccounts)
      } finally {
        setFetching(false)
      }
    },
    [onFetch]
  )

  useEffect(() => {
    ;(async () => {
      if (!connectedAccounts) {
        await handleFetchConnectedAccounts()
      }
    })()
  }, [connectedAccounts, handleFetchConnectedAccounts])

  const handleLinkAccount = (connection: string, strategy: string) => async () => {
    if (!allowLink) {
      return
    }
    setIsLinkingAccount(connection)

    const returnToUrl = new URL("/api/link-account", window.location.origin)
    const authzURL = new URL("/auth/login", window.location.origin)
    const profileURL = new URL("/profile", window.location.origin)

    returnToUrl.searchParams.set("returnTo", profileURL.toString())

    authzURL.searchParams.set("tx", "link-account")
    authzURL.searchParams.set("tx_strategy", strategy)
    authzURL.searchParams.set("tx_sub", user!.sub)
    authzURL.searchParams.set("connection", connection)
    authzURL.searchParams.set("returnTo", returnToUrl.toString())

    window.location.href = authzURL.toString()
  }

  const handleUnlinkAccount = (connection: string) => async () => {
    if (!onUnlink) {
      return
    }

    setIsUnlinkingAccount(connection)

    try {
      await onUnlink(connection)

      try {
        const authzURL = new URL("/auth/login", window.location.origin)
        const profileURL = new URL("/profile", window.location.origin)
        authzURL.searchParams.set("returnTo", profileURL.toString())

        window.location.href = authzURL.toString()
      } catch (error) {
        console.error(error)
      }
    } catch (error) {
      console.error(error)

      setIsUnlinkingAccount(null)

      return toast({
        title: "Info",
        description: "There was a problem unlinking the account. Try again later.",
      })
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="p-4 md:p-6 mb-3 md:pt-0 md:pb-0">
        <CardTitle className="text-lg sm:text-md font-bold tracking-tight">Integrations</CardTitle>
        <CardDescription className="text-sm font-light">
          Allow the chatbot to reference other apps and services for more context.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 p-4 pt-0 md:p-6 md:pt-0 md:pb-0">
        {fetching && (
          <div className="flex w-full items-center justify-left">
            <Spinner />
            <span className="ml-2 text-sm text-muted-foreground">
              Retrieving your connected accounts...
            </span>
          </div>
        )}

        {!currentConnectedAccounts && !fetching && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between space-x-2">
              <Label className="flex flex-col space-y-2">
                <p className="font-normal leading-snug text-muted-foreground max-w-fit">
                  There was a problem fetching your connected accounts. Try again later.
                </p>
              </Label>
            </div>
          </div>
        )}

        {!fetching &&
          currentConnectedAccounts &&
          availableAccounts.map(
            ({ connection, displayName, description, strategy, icon }: Account, idx: number) => {
              const isConnected = currentConnectedAccounts.some(
                cca => cca.connection === connection
              )

              const isMainConnection = connection === currentConnectedAccounts[0]?.connection

              return (
                <div
                  key={`connection-${idx}-${connection}`}
                  className="flex flex-col gap-4 rounded-lg border px-4 py-4"
                >
                  <div
                    key={connection}
                    className="flex flex-col md:flex-row items-center justify-between md:space-x-2 space-y-6 md:space-y-0"
                  >
                    <Label className="flex flex-col space-y-2">
                      <div className="flex gap-3 items-center w-full">
                        {icon}
                        <div className="flex flex-col">
                          <span className="leading-6 text-sm font-medium">{displayName}</span>
                          {description && (
                            <p className="font-light text-sm leading-5 text-muted-foreground max-w-fit">
                              {description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Label>
                    <div
                      className="flex space-x-24 items-center justify-end"
                      style={{ minWidth: "114px" }}
                    >
                      {isConnected ? (
                        <>
                          {onUnlink && (
                            <Button
                              className="h-fit w-full transition-all ease-in-out border-red-500 border text-red-500 hover:bg-red-500 hover:text-white hover:cursor-pointer"
                              variant="outline"
                              onClick={handleUnlinkAccount(connection)}
                              disabled={isUnlinkingAccount === connection || isMainConnection}
                            >
                              {isUnlinkingAccount === connection ? <Spinner /> : "Disconnect"}
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          className="h-fit w-full transition-all ease-linear hover:cursor-pointer"
                          variant="outline"
                          disabled={!allowLink || isLinkingAccount === connection}
                          onClick={handleLinkAccount(connection, strategy)}
                        >
                          {isLinkingAccount === connection ? <Spinner /> : "Connect"}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="relative w-full border-t-gray-200 border-t pt-4 text-sm grid grid-cols-[0_1fr] gap-y-2 items-start bg-card text-card-foreground">
                    <div className="col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight text-muted-foreground ">
                      Based on the consent you&apos;ve granted, the app <strong>MAY</strong> be
                      allowed to:
                    </div>
                    <ul className="text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed">
                      {ConnectionsMetadata.find(
                        conn => conn.connection === connection
                      )?.friendlyScopes?.map(scope => (
                        <li key={scope} className="list-disc ml-5">
                          {scope}
                        </li>
                      )) || <li>No scopes available</li>}
                    </ul>
                    {/* <div className="col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight text-muted-foreground ">
                      To see what exact permissions you've consented to, see your{" "}
                      <a href="#">account page</a> for this provider.
                    </div> */}
                  </div>
                </div>
              )
            }
          )}
      </CardContent>
    </Card>
  )
}
