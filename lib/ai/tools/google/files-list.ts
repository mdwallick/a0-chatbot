import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel"
import { TokenVaultError } from "@auth0/ai/interrupts"
import { google } from "googleapis"

import { getGoogleAuth, withGoogleDriveRead } from "@/lib/auth0-ai/google"

const toolSchema = z.object({
  query: z.string().optional().nullable().describe("What to search the Google Drive for."),
})

export const GoogleFilesListTool = withGoogleDriveRead(
  tool({
    description: "list files from Google Drive",
    inputSchema: toolSchema,
    execute: async ({ query }) => {
      const logs = []

      try {
        // Get the access token from Auth0 AI
        const access_token = getAccessTokenFromTokenVault()
        logs.push("got access token from token vault")

        // Create Google OAuth client.
        const auth = getGoogleAuth(access_token)
        const drive = google.drive({ version: "v3", auth })
        const res = await drive.files.list({
          q: query || undefined,
          fields: "files(id, name)",
        })
        const items = res.data

        logs.push("Successfully retrieved items:", {
          itemCount: items.files?.length || 0,
          hasItems: !!items,
        })

        return {
          logs,
          items,
        }
      } catch (error) {
        if (error instanceof GaxiosError) {
          if (error.status === 401) {
            throw new TokenVaultError(`Authorization required to access the Federated Connection`)
          }
        }

        throw error
      }
    },
  })
)
