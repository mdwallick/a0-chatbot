import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"
import { Client } from "@microsoft/microsoft-graph-client"

import { withOneDrive } from "@/lib/auth0-ai/windows-live"

export const listOneDriveFiles = withOneDrive(
  tool({
    description: "list files from One Drive",
    parameters: z.object({}),
    execute: async () => {
      // Get the access token from Auth0 AI
      const access_token = getAccessTokenForConnection()

      // One Drive SDK
      try {
        const client = Client.initWithMiddleware({
          authProvider: {
            getAccessToken: async () => {
              return access_token
            },
          },
        })

        const items = await client.api("/me/drive/root/children").get()

        return items
      } catch (error) {
        if (error instanceof GaxiosError) {
          if (error.status === 401) {
            throw new FederatedConnectionError(
              `Authorization required to access the Federated Connection`
            )
          }
        }

        throw error
      }
    },
  })
)
