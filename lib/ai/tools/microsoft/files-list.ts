import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"
import { Client } from "@microsoft/microsoft-graph-client"

import { withOneDrive } from "../../../auth0-ai/windows-live"

const toolSchema = z.object({
  path: z
    .string()
    .describe(
      "Full path to the file in OneDrive (e.g. /example.pdf or /notes.txt or /report.docx or /data.xlsx)"
    ),
})

export const MicrosoftFilesListTool = withOneDrive(
  tool({
    description: "list files from One Drive",
    parameters: toolSchema,
    execute: async ({ path = "" }) => {
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

        const drivePath = path ? `/me/drive/root:/${path}:/children` : `/me/drive/root/children`
        const items = await client.api(drivePath).get()
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
