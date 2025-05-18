import { tool } from "ai"
import BoxSDK from "box-node-sdk"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"

import { withBox } from "@/lib/auth0-ai/box"

export const boxTools = withBox(
  tool({
    description: "list files from Box",
    parameters: z.object({}),
    execute: async () => {
      // Get the access token from Auth0 AI
      const access_token = getAccessTokenForConnection()

      // Box SDK
      try {
        // Note:  The client ID and secret are required for the SDK to
        //        work but we are using the access token from Auth0 AI.
        const sdk = new BoxSDK({
          clientID: "xxx-xxxx",
          clientSecret: "xxx-xxxx",
        })

        const client = sdk.getBasicClient(access_token)

        const items = await client.folders.getItems("0", {
          limit: 100,
          offset: 0,
        })

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
