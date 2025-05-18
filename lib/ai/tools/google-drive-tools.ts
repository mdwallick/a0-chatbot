import { jsonSchema, Tool, tool } from "ai"
import { google } from "googleapis"

import { asAgenticSchema, isZodSchema } from "@agentic/core"
import { GoogleDriveClient } from "@agentic/google-drive"
import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"

import { withGoogleDriveTools } from "@/lib/auth0-ai/google"

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
          console.log(`[DEBUG] Executing Google Drive tool: ${fn.spec.name}`, {
            args,
            toolName: fn.spec.name,
            hasAuth: !!auth,
            hasDrive: !!drive,
          })

          try {
            // Get the access token from Auth0 AI
            console.log("[DEBUG] Getting access token...")
            const access_token = getAccessTokenForConnection()
            console.log("[DEBUG] Access token status:", access_token ? "Present" : "Missing")

            if (!access_token) {
              console.error("[ERROR] No access token available for Google Drive")
              throw new FederatedConnectionError("Authorization required to access Google Drive")
            }

            // Set credentials and execute function
            console.log("[DEBUG] Setting credentials and executing function...")
            auth.setCredentials({ access_token })

            // Execute the function with detailed logging
            console.log("[DEBUG] Executing drive function with args:", {
              functionName: fn.spec.name,
              args: JSON.stringify(args),
            })

            const result = await fn.execute(args)

            if (!result) {
              console.error("[ERROR] No result returned from Google Drive operation")
              throw new Error("No result returned from Google Drive operation")
            }

            console.log(`[DEBUG] Tool ${fn.spec.name} executed successfully:`, {
              hasResult: !!result,
              resultType: typeof result,
            })

            return result
          } catch (error: any) {
            console.error(`[ERROR] Google Drive tool ${fn.spec.name} failed:`, {
              error,
              errorType: error?.constructor?.name,
              errorMessage: error?.message,
              errorResponse: error?.response?.data,
              errorStatus: error?.response?.status,
            })

            // Handle specific error types
            if (error instanceof FederatedConnectionError) {
              console.error("[ERROR] Federation connection error:", error.message)
              throw error // Re-throw auth errors
            }

            if (error?.response?.status === 401 || error?.response?.status === 403) {
              console.error("[ERROR] Authentication error:", error.response.status)
              throw new FederatedConnectionError("Authorization required to access Google Drive")
            }

            // Throw a generic error for other cases
            throw new Error(
              `Google Drive operation failed: ${error instanceof Error ? error.message : String(error)}`
            )
          }
        },
      }) as Tool
    ),
  ])
)
