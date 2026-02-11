import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel"
import { TokenVaultError } from "@auth0/ai/interrupts"

import { Endpoints, callXboxApi, withXboxRead } from "@/lib/auth0-ai/xbox"

const toolSchema = z.object({
  userId: z
    .string()
    .optional()
    .nullable()
    .default("me")
    .describe("Gamertag, xuid, or me. Defaults to me."),
})

export const XboxAchievementTool = withXboxRead(
  tool({
    description: "Get user's achievement progress",
    inputSchema: toolSchema,
    execute: async () => {
      const logs = []

      try {
        // Get the access token from Auth0 AI
        const accessToken = getAccessTokenFromTokenVault()
        logs.push("got access token from token vault")

        if (!accessToken) {
          logs.push("access token missing or expired")
          throw new TokenVaultError("Authorization required to access Xbox")
        }

        let userData = {
          userData: "no response from server",
        }

        logs.push("Getting Xbox achievement information")
        const url = `https://${Endpoints.achievements.baseUri}/users/me/history/titles`
        const response = await callXboxApi(url, accessToken)

        if (response.status === 200) {
          userData = response.data
        }

        return {
          logs,
          userData,
        }
      } catch (error) {
        if (error instanceof GaxiosError) {
          if (error.status === 401) {
            throw new TokenVaultError(`Authorization required to access the Federated Connection`)
          }
        }

        // throw error
        console.error("General error:", error)
        throw new Error(`Internal Server Error: ${error}`)
      }
    },
  })
)
