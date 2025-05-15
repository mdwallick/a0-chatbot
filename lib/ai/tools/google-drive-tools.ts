import { jsonSchema, Tool, tool } from "ai"
import { google } from "googleapis"

import { asAgenticSchema, isZodSchema } from "@agentic/core"
import { GoogleDriveClient } from "@agentic/google-drive"
import { getAccessTokenForConnection } from "@auth0/ai-vercel"

import { withGoogleDriveTools } from "../../auth0-ai/google"

const auth = new google.auth.OAuth2()
const drive = google.drive({ version: "v3", auth })
const client = new GoogleDriveClient({ drive })

export const googleDriveTools = Object.fromEntries(
  client.functions.map(fn => [
    fn.spec.name,
    withGoogleDriveTools(
      tool({
        description: fn.spec.description,
        parameters: isZodSchema(fn.inputSchema)
          ? fn.inputSchema
          : jsonSchema(asAgenticSchema(fn.inputSchema).jsonSchema),
        execute: async args => {
          // Get the access token from Auth0 AI
          const access_token = getAccessTokenForConnection()

          auth.setCredentials({
            access_token,
          })

          // Execute Google Drive function from `@agentic`
          return fn.execute(args)
        },
      }) as Tool
    ),
  ])
)
