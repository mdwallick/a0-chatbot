import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"

import { Endpoints, callXboxApi, withXbox } from "@/lib/auth0-ai/xbox"

const toolSchema = z.object({
  userId: z
    .string()
    .optional()
    .nullable()
    .default("2533274871288605")
    .describe("Gamertag, xuid, or me. Defaults to me."),
})

export const XboxAchievementTool = withXbox(
  tool({
    description: "Get user's game inventory",
    parameters: toolSchema,
    execute: async () => {
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

        logs.push("Getting Xbox achievement information")
        const url = `https://${Endpoints.achievements.baseUri}/users/xuid(2533274871288605)/history/titles`
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
