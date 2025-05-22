import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"

import { Endpoints, callXboxApi, withXboxRead } from "@/lib/auth0-ai/xbox"

const toolSchema = z.object({
  userId: z
    .string()
    .optional()
    .nullable()
    .default("me")
    .describe("Gamertag, xuid, or me. Defaults to me."),
})

export const XboxUserProfileTool = withXboxRead(
  tool({
    description: "Get user's profile from Xbox Live",
    parameters: toolSchema,
    execute: async () => {
      const logs = []

      try {
        // Get the access token from Auth0 AI
        const accessToken = getAccessTokenForConnection()
        logs.push("got access token from token vault")
        console.log("msft access token", accessToken)

        if (!accessToken) {
          logs.push("access token missing or expired")
          throw new FederatedConnectionError("Authorization required to access Xbox")
        }

        let userData = {
          userData: "no response from server",
        }

        logs.push("Getting Xbox user profile information")
        const settings = "GameDisplayName,GameDisplayPicRaw,Gamerscore,Gamertag,TenureLevel"
        const url = `https://${Endpoints.profile.baseUri}/users/me/profile/settings?settings=${settings}`
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
            throw new FederatedConnectionError(
              `Authorization required to access the Federated Connection`
            )
          }
        }

        // throw error
        console.error("General error:", error)
        throw error
      }
    },
  })
)
