import { tool } from "ai"
import { z } from "zod"

import { withMSOneDriveRead } from "@/lib/auth0-ai/microsoft"
import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel"
import { TokenVaultError } from "@auth0/ai/interrupts"
import { Client } from "@microsoft/microsoft-graph-client"

const toolSchema = z.object({
  path: z
    .string()
    .optional()
    .nullable()
    .describe("Path to the folder (e.g. /Documents). Leave blank for root."),
})

export const MicrosoftFilesListTool = withMSOneDriveRead(
  tool({
    description: "list files from One Drive",
    inputSchema: toolSchema,
    execute: async ({ path = "" }) => {
      const logs = []

      try {
        // Get the access token from Auth0 AI
        const access_token = getAccessTokenFromTokenVault()
        logs.push("got access token from token vault")

        if (!access_token) {
          logs.push("access token missing or expired")
          throw new TokenVaultError("Authorization required to access OneDrive")
        }

        // Initialize OneDrive client
        const client = Client.initWithMiddleware({
          authProvider: {
            getAccessToken: async () => {
              return access_token
            },
          },
        })

        // Construct path and fetch items
        const drivePath = path ? `/me/drive/root:/${path}:/children` : `/me/drive/root/children`
        logs.push(`Fetching items from path: ${drivePath}`)

        const items = await client.api(drivePath).get()

        if (!items) {
          logs.push("No items returned from OneDrive")
          throw new Error("No items returned from OneDrive")
        }

        logs.push("Successfully retrieved items:", {
          itemCount: items.value?.length || 0,
          hasItems: !!items.value,
        })

        return {
          logs,
          items,
        }
      } catch (error: any) {
        console.error("[ERROR] OneDrive list files failed:", {
          error,
          errorType: error?.constructor?.name,
          errorMessage: error?.message,
          errorResponse: error?.response?.data,
          errorStatus: error?.response?.status,
        })

        if (error instanceof TokenVaultError) {
          console.error("[ERROR] Federation connection error:", error.message)
          throw error
        }

        if (error?.response?.status === 401 || error?.response?.status === 403) {
          console.error("[ERROR] Authentication error:", error.response.status)
          throw new TokenVaultError("Authorization required to access OneDrive")
        }

        throw new Error(
          `OneDrive operation failed: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    },
  })
)
