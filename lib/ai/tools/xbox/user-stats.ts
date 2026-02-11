import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel"
import { TokenVaultError } from "@auth0/ai/interrupts"

import { Endpoints, callXboxApi, withXboxRead } from "@/lib/auth0-ai/xbox"

const toolSchema = z.object({
  gameTitle: z.string().describe("The title or name of the game in question."),
  serviceConfigId: z.string().describe("The serviceConfigId value. This is from chat context."),
})

export const XboxUserStatsTool = withXboxRead(
  tool({
    description:
      "Get user's game statistics for a given game title/name and serviceConfigId aka SCID",
    inputSchema: toolSchema,
    execute: async ({ gameTitle, serviceConfigId }) => {
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

        logs.push(`Getting Xbox user stats for ${gameTitle}`)
        const url = `https://${Endpoints.userstats.baseUri}/users/me/scids/${serviceConfigId}/stats/wins,kills,kdratio,headshots`
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
        throw error
      }
    },
  })
)
