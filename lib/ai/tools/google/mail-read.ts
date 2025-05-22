import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"

import { google } from "googleapis"
import { getGoogleAuth, withGmailRead } from "@/lib/auth0-ai/google"

const toolSchema = z.object({
  query: z.string().optional().nullable().describe("Search query for the email subject or body"),
  top: z
    .number()
    .optional()
    .nullable()
    .default(10)
    .describe("Number of emails to return (default is 10)"),
})

export const GmailReadTool = withGmailRead(
  tool({
    description: "Read Gmail messages",
    parameters: toolSchema,
    execute: async ({ query, top }) => {
      const logs = []

      const access_token = getAccessTokenForConnection()
      logs.push("got access token from token vault")

      // Create Google OAuth client.
      const auth = getGoogleAuth(access_token)

      try {
        const gmail = google.gmail({ version: "v1", auth })

        // get a list of emails
        const res = await gmail.users.messages.list({
          userId: "me",
          q: query || undefined,
          maxResults: top || 10,
        })

        const messages = res.data.messages || []
        const data = [{}]
        for (const msg of messages) {
          if (typeof msg.id === "string") {
            const message = await gmail.users.messages.get({
              userId: "me",
              id: msg.id,
              format: "full",
              metadataHeaders: ["Subject", "From", "Date"],
            })

            const headers = message.data.payload?.headers || []

            const subject = headers.find(h => h.name === "Subject")?.value
            const from = headers.find(h => h.name === "From")?.value
            const date = headers.find(h => h.name === "Date")?.value
            const parts = message.data.payload?.parts || []
            const plainTextPart = parts.find(part => part.mimeType === "text/plain")
            const body = Buffer.from(plainTextPart?.body?.data || "", "base64").toString("utf-8")
            console.log(body)

            data.push({
              id: msg.id,
              subject,
              from,
              date,
              body,
            })
          } else {
            console.error("Invalid message")
          }
        }

        return {
          logs,
          data,
        }
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
