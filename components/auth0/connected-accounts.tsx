"use client"

import React, { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import { useUser } from "@auth0/nextjs-auth0"

import type { ProviderKey } from "@/lib/auth0-ai/connections-metadata"
import { UserScopeMetadata } from "@/lib/auth0-ai/connections-metadata"
import { categorizeScopes, getNonEmptyCategories } from "@/lib/auth0-ai/scope-categories"

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
  grantedScopes?: string[]
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

              const detailedConnectedAccount = currentConnectedAccounts?.find(
                cca => cca.connection === connection
              )
              const scopesToDisplay = detailedConnectedAccount?.grantedScopes || []
              const providerKeyForLookup = connection.toLowerCase() as ProviderKey
              const providerInfo = UserScopeMetadata[providerKeyForLookup]
              const accountManagementUrl = providerInfo?.userAccountUrl

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
                          <div className="flex items-center gap-2">
                            <span className="leading-6 text-sm font-medium">{displayName}</span>
                            {isMainConnection && (
                              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                Primary
                              </span>
                            )}
                          </div>
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="w-full">
                                  <Button
                                    className="h-fit w-full transition-all ease-in-out border-red-500 border text-red-500 hover:bg-red-500 hover:text-white hover:cursor-pointer"
                                    variant="outline"
                                    onClick={handleUnlinkAccount(connection)}
                                    disabled={isUnlinkingAccount === connection || isMainConnection}
                                  >
                                    {isUnlinkingAccount === connection ? <Spinner /> : "Disconnect"}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {isMainConnection && (
                                <TooltipContent>Cannot disconnect primary account</TooltipContent>
                              )}
                            </Tooltip>
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
                  {isConnected && (
                    <div className="relative w-full border-t-gray-200 border-t pt-4 text-sm grid grid-cols-[0_1fr] gap-y-2 items-start bg-card text-card-foreground">
                      <div className="col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight text-muted-foreground ">
                        You have granted permission to this app to:
                      </div>
                      <div className="col-start-2">
                        {scopesToDisplay.length > 0 ? (
                          <CategorizedScopes connection={connection} scopes={scopesToDisplay} />
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            No specific permissions found.
                          </p>
                        )}
                      </div>
                      <div className="col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight text-muted-foreground ">
                        To manage or revoke this consent, see your{" "}
                        <a
                          href={accountManagementUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-primary font-medium"
                        >
                          account page
                        </a>{" "}
                        for this provider.
                      </div>
                    </div>
                  )}
                </div>
              )
            }
          )}
      </CardContent>
    </Card>
  )
}

/**
 * Finds the friendly name for a technical scope given a provider.
 * @param {string} providerName - The name of the connection/provider (e.g., "google").
 * @param {string} technicalScope - The technical scope string.
 * @returns {string} The friendly scope string, or the technical scope if not found.
 */
function getFriendlyScopeName(providerName: string, technicalScope: string) {
  const normalizedProviderName = providerName.toLowerCase() as ProviderKey
  const providerData = UserScopeMetadata[normalizedProviderName]

  if (providerData && providerData.scopes && providerData.friendlyScopes) {
    const scopeIndex = providerData.scopes.indexOf(technicalScope)
    if (scopeIndex !== -1 && scopeIndex < providerData.friendlyScopes.length) {
      return providerData.friendlyScopes[scopeIndex]
    }
  }
  // Fallback to the technical scope if no friendly name is found
  return technicalScope
}

/**
 * Renders scopes grouped by category
 */
function CategorizedScopes({ connection, scopes }: { connection: string; scopes: string[] }) {
  const categorized = categorizeScopes(connection, scopes)
  const nonEmptyCategories = getNonEmptyCategories(categorized)

  if (nonEmptyCategories.length === 0) {
    return <p className="text-muted-foreground text-sm">No specific permissions found.</p>
  }

  return (
    <div className="space-y-3">
      {nonEmptyCategories.map(([category, categoryScopes]) => (
        <div key={category}>
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {category}
          </h5>
          <ul className="text-muted-foreground grid justify-items-start gap-0.5 text-sm">
            {categoryScopes.map(scope => (
              <li key={scope} className="list-disc ml-5">
                {getFriendlyScopeName(connection, scope)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
