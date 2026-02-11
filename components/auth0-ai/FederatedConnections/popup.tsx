"use client"

import { useCallback, useEffect, useState } from "react"
import { useUser } from "@auth0/nextjs-auth0"

import { WaitingMessage } from "../util/loader"
import { PromptUserContainer } from "../util/prompt-user-container"
import { FederatedConnectionAuthProps } from "./FederatedConnectionAuthProps"
import { useRefreshLinkedAccounts } from "../../use-linked-accounts-context"

const SESSION_STORAGE_KEY = "auth0_connected_account_session"

type ConnectionSessionData = {
  auth_session: string
  redirect_uri: string
  state: string
}

function saveConnectionSession(data: ConnectionSessionData) {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data))
}

function getConnectionSession(): ConnectionSessionData | null {
  const data = sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

function clearConnectionSession() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY)
}

/**
 * EnsureAPIAccessPopup - Handles the Connected Accounts flow for Token Vault
 *
 * This component uses the Auth0 My Account API to create connected accounts,
 * which stores tokens in the Token Vault for API access.
 *
 * Flow:
 * 1. User clicks "Grant Access"
 * 2. Call /api/connected-accounts/connect to initiate the flow
 * 3. Open popup to Auth0's connect_uri
 * 4. User authorizes with external provider (e.g., Microsoft)
 * 5. Callback page sends connect_code via postMessage
 * 6. Call /api/connected-accounts/complete to finish
 * 7. Token is now stored in Token Vault
 * 8. Call resume() and regenerate() to retry the tool
 */
export function EnsureAPIAccessPopup({
  interrupt: { connection, requiredScopes, resume },
  connectWidget: { icon, title, description, action, containerClassName },
  onFinish,
  regenerate,
}: FederatedConnectionAuthProps & { regenerate?: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useUser()
  const refreshLinkedAccounts = useRefreshLinkedAccounts()

  // Handle postMessage from callback popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin
      if (event.origin !== window.location.origin) {
        return
      }

      if (event.data.type === "CONNECTED_ACCOUNT_CALLBACK") {
        const { connect_code, state } = event.data
        const sessionData = getConnectionSession()

        console.log("[Connected Accounts] Received callback:", { connect_code, state })
        console.log("[Connected Accounts] Session data:", sessionData)

        // Verify state matches
        if (sessionData && state && state !== sessionData.state) {
          console.warn("[Connected Accounts] State mismatch, ignoring callback")
          return
        }

        if (!sessionData) {
          console.error("[Connected Accounts] No session data found")
          setError("Session expired. Please try again.")
          setIsLoading(false)
          return
        }

        console.log("[Connected Accounts] Completing connection...")

        try {
          // Complete the connection
          const completeResponse = await fetch("/api/connected-accounts/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              auth_session: sessionData.auth_session,
              connect_code,
              redirect_uri: sessionData.redirect_uri,
            }),
          })

          if (!completeResponse.ok) {
            const errorData = await completeResponse.json()
            throw new Error(errorData.error || "Failed to complete connection")
          }

          const result = await completeResponse.json()
          console.log("[Connected Accounts] Connection completed:", result)

          // Clear session data
          clearConnectionSession()

          // Refresh linked accounts
          await refreshLinkedAccounts()

          // Small delay to ensure token is available
          await new Promise(resolve => setTimeout(resolve, 1000))

          // Resume AI processing
          if (typeof resume === "function") {
            console.log("[Connected Accounts] Resuming AI processing")
            resume()

            // Trigger regenerate to re-execute the tool
            if (typeof regenerate === "function") {
              console.log("[Connected Accounts] Triggering regenerate")
              regenerate()
            }
          }

          // Call onFinish for UI cleanup
          if (typeof onFinish === "function") {
            onFinish()
          }
        } catch (err) {
          console.error("[Connected Accounts] Error completing connection:", err)
          setError(err instanceof Error ? err.message : "Failed to complete connection")
          clearConnectionSession()
        } finally {
          setIsLoading(false)
        }
      } else if (event.data.type === "CONNECTED_ACCOUNT_ERROR") {
        console.error("[Connected Accounts] Callback error:", event.data.error)
        setError(event.data.error)
        setIsLoading(false)
        clearConnectionSession()
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [resume, regenerate, onFinish, refreshLinkedAccounts])

  // Start the Connected Accounts flow
  const startConnectionFlow = useCallback(async () => {
    if (!user) {
      setError("You must be logged in to connect accounts")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log("[Connected Accounts] Starting connection flow:", {
        connection,
        requiredScopes,
      })

      // Step 1: Initiate the connection via our API
      // Always include offline_access to ensure refresh tokens are stored in Token Vault
      const scopesWithOfflineAccess = requiredScopes.includes("offline_access")
        ? requiredScopes
        : ["offline_access", ...requiredScopes]

      const initiateResponse = await fetch("/api/connected-accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection,
          scopes: scopesWithOfflineAccess,
        }),
      })

      if (!initiateResponse.ok) {
        const errorData = await initiateResponse.json()
        throw new Error(errorData.error || "Failed to initiate connection")
      }

      const { connect_uri, auth_session, state, redirect_uri } = await initiateResponse.json()

      console.log("[Connected Accounts] Connection initiated:", {
        connect_uri,
        auth_session,
        redirect_uri,
        state,
      })
      console.log("[Connected Accounts] Opening popup to:", connect_uri)

      // Store session data in sessionStorage for callback verification
      saveConnectionSession({
        auth_session,
        redirect_uri,
        state,
      })

      // Step 2: Open popup to connect_uri for user authorization
      const windowFeatures = "width=600,height=700,status=no,toolbar=no,menubar=no,scrollbars=yes"
      const popup = window.open(connect_uri, "auth0_connected_account", windowFeatures)

      if (!popup) {
        clearConnectionSession()
        throw new Error("Popup was blocked. Please allow popups for this site.")
      }

      // Monitor popup for closure without completion
      const pollInterval = setInterval(() => {
        if (popup.closed && getConnectionSession()) {
          // Popup was closed without completing
          clearInterval(pollInterval)
          console.log("[Connected Accounts] Popup closed without completion")
          setIsLoading(false)
          clearConnectionSession()
        }
      }, 1000)

      // Clear interval after 5 minutes (session timeout)
      setTimeout(
        () => {
          clearInterval(pollInterval)
          if (getConnectionSession()) {
            setIsLoading(false)
            setError("Connection session expired. Please try again.")
            clearConnectionSession()
          }
        },
        5 * 60 * 1000
      )
    } catch (err) {
      console.error("[Connected Accounts] Error starting flow:", err)
      setError(err instanceof Error ? err.message : "Failed to start connection")
      setIsLoading(false)
    }
  }, [connection, requiredScopes, user])

  if (isLoading) {
    return <WaitingMessage />
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</p>
        <button
          onClick={() => {
            setError(null)
            startConnectionFlow()
          }}
          className="text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <PromptUserContainer
      title={title}
      description={description}
      icon={icon}
      containerClassName={containerClassName}
      action={{
        label: action?.label ?? "Grant Access",
        onClick: startConnectionFlow,
      }}
    />
  )
}
