import { tool } from "ai"
import { z } from "zod"

import { withOneDrive } from "@/lib/auth0-ai/windows-live"
import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"
import { Client } from "@microsoft/microsoft-graph-client"

const toolSchema = z.object({
  path: z
    .string()
    .optional()
    .nullable()
    .describe("Path to the folder (e.g. /Documents). Leave blank for root."),
})

export const MicrosoftFilesListTool = withOneDrive(
  tool({
    description: "list files from One Drive",
    parameters: toolSchema,
    execute: async ({ path = "" }) => {
      console.log("[DEBUG] Executing OneDrive list files tool", { path })

      try {
        // Get the access token from Auth0 AI
        console.log("[DEBUG] Getting access token...")
        const access_token = getAccessTokenForConnection()
        console.log("[DEBUG] Access token status:", access_token ? "Present" : "Missing")

        if (!access_token) {
          console.error("[ERROR] No access token available for OneDrive")
          throw new FederatedConnectionError("Authorization required to access OneDrive")
        }

        // Initialize OneDrive client
        console.log("[DEBUG] Initializing OneDrive client...")
        const client = Client.initWithMiddleware({
          authProvider: {
            getAccessToken: async () => {
              return access_token
            },
          },
        })

        // Construct path and fetch items
        const drivePath = path ? `/me/drive/root:/${path}:/children` : `/me/drive/root/children`
        console.log("[DEBUG] Fetching items from path:", drivePath)

        const items = await client.api(drivePath).get()

        if (!items) {
          console.error("[ERROR] No items returned from OneDrive")
          throw new Error("No items returned from OneDrive")
        }

        console.log("[DEBUG] Successfully retrieved items:", {
          itemCount: items.value?.length || 0,
          hasItems: !!items.value,
        })

        return items
      } catch (error: any) {
        console.error("[ERROR] OneDrive list files failed:", {
          error,
          errorType: error?.constructor?.name,
          errorMessage: error?.message,
          errorResponse: error?.response?.data,
          errorStatus: error?.response?.status,
        })

        if (error instanceof FederatedConnectionError) {
          console.error("[ERROR] Federation connection error:", error.message)
          throw error
        }

        if (error?.response?.status === 401 || error?.response?.status === 403) {
          console.error("[ERROR] Authentication error:", error.response.status)
          throw new FederatedConnectionError("Authorization required to access OneDrive")
        }

        throw new Error(
          `OneDrive operation failed: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    },
  })
)
