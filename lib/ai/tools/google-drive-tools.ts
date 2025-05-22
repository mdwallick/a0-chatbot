import { jsonSchema, Tool, tool } from "ai"
import { GaxiosError } from "gaxios"
import { google } from "googleapis"

import { asAgenticSchema, isZodSchema } from "@agentic/core"
import { GoogleDriveClient } from "@agentic/google-drive"
import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"

import { withGoogleDriveRead } from "@/lib/auth0-ai/google"

const auth = new google.auth.OAuth2()
const drive = google.drive({ version: "v3", auth })
const client = new GoogleDriveClient({ drive })

export const googleDriveTools = Object.fromEntries(
  client.functions.map(fn => [
    fn.spec.name,
    withGoogleDriveRead(
      tool({
        description: fn.spec.description,
        parameters: isZodSchema(fn.inputSchema)
          ? fn.inputSchema
          : jsonSchema(asAgenticSchema(fn.inputSchema).jsonSchema),
        execute: async args => {
          try {
            // Get the access token from Auth0 AI
            const access_token = getAccessTokenForConnection()

            // Set credentials and execute function
            auth.setCredentials({ access_token })
            const result = await fn.execute(args)

            if (!result) {
              console.error("[ERROR] No result returned from Google Drive operation")
              throw new Error("No result returned from Google Drive operation")
            }

            return result
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
      }) as Tool
    ),
  ])
)
