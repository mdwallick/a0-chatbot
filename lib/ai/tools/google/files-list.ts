import { tool } from "ai"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"
import { google } from "googleapis"

import { getGoogleAuth, withGoogleDriveRead } from "@/lib/auth0-ai/google"

const toolSchema = z.object({
  query: z.string().optional().nullable().describe("What to search the Google Drive for."),
})

export const GoogleFilesListTool = withGoogleDriveRead(
  tool({
    description: "list files from Google Drive",
    parameters: toolSchema,
    execute: async ({ query }) => {
      const logs = []

      try {
        // Get the access token from Auth0 AI
        const access_token = getAccessTokenForConnection()
        logs.push("got access token from token vault")

        // Create Google OAuth client.
        const auth = getGoogleAuth(access_token)
        const drive = google.drive({ version: "v3", auth })
        const res = await drive.files.list({
          q: query || undefined,
          fields: "files(id, name)",
        })
        //res.data.files?.forEach(f => console.log(f.name, f.id))
        const items = res.data

        logs.push("Successfully retrieved items:", {
          itemCount: items.files?.length || 0,
          hasItems: !!items,
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
