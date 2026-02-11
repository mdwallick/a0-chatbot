"use client"

import { useEffect, useState } from "react"

/**
 * Connected Accounts Callback Page
 *
 * This page handles the callback from Auth0 after the user authorizes a connected account.
 * The connect_code is returned in the URL fragment (hash), so we need client-side JS to capture it.
 *
 * Flow:
 * 1. User authorizes with external provider (e.g., Microsoft)
 * 2. Provider redirects to Auth0
 * 3. Auth0 redirects here with connect_code in fragment: /callback#connect_code=xxx
 * 4. This page extracts the code and sends it to the parent window
 * 5. Parent window completes the connection via API
 */
export default function ConnectedAccountsCallback() {
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing")
  const [message, setMessage] = useState("Processing authorization...")

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Log the full URL for debugging
        console.log("[Callback] Full URL:", window.location.href)
        console.log("[Callback] Hash:", window.location.hash)
        console.log("[Callback] Search:", window.location.search)

        // Get the fragment (hash) from the URL
        const hash = window.location.hash.substring(1)

        // Also check query params as fallback
        const queryParams = new URLSearchParams(window.location.search)

        // Try to get connect_code from hash first, then query params
        let connectCode: string | null = null
        let state: string | null = null

        if (hash) {
          const hashParams = new URLSearchParams(hash)
          connectCode = hashParams.get("connect_code")
          state = hashParams.get("state")
          console.log("[Callback] From hash - connect_code:", connectCode, "state:", state)
        }

        if (!connectCode) {
          // Try query params
          connectCode = queryParams.get("connect_code")
          state = queryParams.get("state")
          console.log("[Callback] From query - connect_code:", connectCode, "state:", state)
        }

        if (!connectCode) {
          // Check for error
          const error =
            queryParams.get("error") || (hash ? new URLSearchParams(hash).get("error") : null)
          const errorDescription =
            queryParams.get("error_description") ||
            (hash ? new URLSearchParams(hash).get("error_description") : null)

          if (error) {
            throw new Error(errorDescription || error)
          }

          throw new Error("No authorization code received")
        }

        console.log("[Callback] Received connect_code:", connectCode)

        // Send the connect_code to the parent window (popup opener)
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "CONNECTED_ACCOUNT_CALLBACK",
              connect_code: connectCode,
              state,
            },
            window.location.origin
          )

          setStatus("success")
          setMessage("Authorization successful! This window will close automatically.")

          // Close the popup after a short delay
          setTimeout(() => {
            window.close()
          }, 1500)
        } else {
          // If not in a popup, store in sessionStorage for the parent page to pick up
          sessionStorage.setItem(
            "connected_account_callback",
            JSON.stringify({
              connect_code: connectCode,
              state,
              timestamp: Date.now(),
            })
          )

          setStatus("success")
          setMessage("Authorization successful! You can close this window.")
        }
      } catch (error) {
        console.error("[Connected Accounts Callback] Error:", error)
        setStatus("error")
        setMessage(error instanceof Error ? error.message : "Authorization failed")

        // Notify parent of error
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "CONNECTED_ACCOUNT_ERROR",
              error: error instanceof Error ? error.message : "Authorization failed",
            },
            window.location.origin
          )
        }
      }
    }

    processCallback()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center p-8 max-w-md">
        {status === "processing" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-green-500 mb-4">
              <svg
                className="h-12 w-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-foreground font-medium">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-red-500 mb-4">
              <svg
                className="h-12 w-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-red-500 font-medium">{message}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  )
}
