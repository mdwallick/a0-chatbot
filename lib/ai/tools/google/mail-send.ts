import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"

import { google } from "googleapis"
import { getGoogleAuth, withGmailSend } from "@/lib/auth0-ai/google"

const toolSchema = z.object({
  subject: z.string().describe("Subject of the email"),
  body: z.string().describe("Body content of the email (can include HTML)"),
  to: z.string().describe("Recipient email addresses"),
  //cc: z.array(z.string()).optional().nullable().describe("Array of CC recipient email addresses"),
  // importance: z
  //   .enum(["low", "normal", "high"])
  //   .optional()
  //   .nullable()
  //   .default("normal")
  //   .describe("Importance of the email"),
})

export const GmailSendTool = withGmailSend(
  tool({
    description: "Write/Send Microsoft Outlook emails",
    parameters: toolSchema,
    execute: async ({ subject, body, to }) => {
      const logs = []
      const access_token = getAccessTokenForConnection()
      logs.push("got access token from token vault")

      // Create Google OAuth client.
      const auth = getGoogleAuth(access_token)

      try {
        logs.push("Creating email", to, subject)
        const message = makeRawEmail(to, subject, body)
        const gmail = google.gmail({ version: "v1", auth })
        const response = await gmail.users.messages.send({
          userId: "me",
          requestBody: {
            raw: message,
          },
        })

        logs.push("Email sent:", response.data.id)
        return {
          logs,
          response,
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

function makeRawEmail(to: string, subject: string, body: string) {
  const messageParts = [
    `To: ${to}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
    "",
    body,
  ]
  const message = messageParts.join("\n")
  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
  return encodedMessage
}
