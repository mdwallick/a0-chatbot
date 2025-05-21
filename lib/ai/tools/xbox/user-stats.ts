import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"

import { Endpoints, callXboxApi, withXbox } from "@/lib/auth0-ai/xbox"

const toolSchema = z.object({
  gameTitle: z.string().describe("The title or name of the game in question."),
  serviceConfigId: z.string().describe("The serviceConfigId value. This is from chat context."),
})

export const XboxUserStatsTool = withXbox(
  tool({
    description:
      "Get user's game statistics for a given game title/name and serviceConfigId aka SCID",
    parameters: toolSchema,
    execute: async ({ gameTitle, serviceConfigId }) => {
      console.log("XboxUserStatsTool with args", gameTitle, serviceConfigId)
      const logs = []

      try {
        // Get the access token from Auth0 AI
        const accessToken = getAccessTokenForConnection()
        logs.push("got access token from token vault")

        if (!accessToken) {
          logs.push("access token missing or expired")
          throw new FederatedConnectionError("Authorization required to access Xbox")
        }

        let userData = {
          userData: "no response from server",
        }

        console.log(`Getting Xbox user stats for ${gameTitle}`)
        logs.push(`Getting Xbox user stats for ${gameTitle}`)
        const url = `https://${Endpoints.userstats.baseUri}/users/me/scids/${serviceConfigId}/stats/wins,kills,kdratio,headshots`
        const response = await callXboxApi(url, accessToken)

        if (response.status === 200) {
          userData = response.data
          console.log(userData)
        }

        return {
          logs,
          userData,
        }
      } catch (error) {
        if (error instanceof GaxiosError) {
          if (error.status === 401) {
            throw new FederatedConnectionError(
              `Authorization required to access the Federated Connection`
            )
          }
        }

        // throw error
        console.error("General error:", error)
        throw new Error(`Internal Server Error: ${error}`)
      }
    },
  })
)
