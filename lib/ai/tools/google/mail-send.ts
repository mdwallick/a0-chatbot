import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel"
import { TokenVaultError } from "@auth0/ai/interrupts"

import { google } from "googleapis"
import { getGoogleAuth, withGmailWrite } from "@/lib/auth0-ai/google"

const toolSchema = z.object({
  action: z
    .enum(["send", "draft"])
    .describe("The action to perform: 'send' to send immediately, or 'draft' to save as draft"),
  subject: z.string().describe("Subject of the email"),
  body: z.string().describe("Body content of the email (can include HTML)"),
  to: z
    .string()
    .optional()
    .describe("Recipient email addresses (required for sending, optional for drafts)"),
  cc: z.array(z.string()).optional().nullable().describe("Array of CC recipient email addresses"),
})

export const GmailSendTool = withGmailWrite(
  tool({
    description: "Send Gmail emails or create drafts",
    inputSchema: toolSchema,
    execute: async ({ action, subject, body, to, cc }) => {
      const logs: string[] = []
      const access_token = getAccessTokenFromTokenVault()
      logs.push("Got access token from token vault")

      const auth = getGoogleAuth(access_token)
      const gmail = google.gmail({ version: "v1", auth })

      try {
        const message = makeRawEmail(to, subject, body, cc)

        if (action === "send") {
          if (!to) {
            return {
              error: "Recipient 'to' is required for sending emails",
              logs,
            }
          }
          logs.push(`Sending email to: ${to}, subject: ${subject}`)
          const response = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
              raw: message,
            },
          })
          logs.push(`Email sent successfully: ${response.data.id}`)
          return {
            logs,
            status: "success",
            message: "Email sent successfully",
            emailId: response.data.id,
          }
        } else if (action === "draft") {
          logs.push(`Creating draft with subject: ${subject}`)
          const response = await gmail.users.drafts.create({
            userId: "me",
            requestBody: {
              message: {
                raw: message,
              },
            },
          })
          logs.push(`Draft created successfully: ${response.data.id}`)
          return {
            logs,
            status: "success",
            message: "Draft created successfully",
            draftId: response.data.id,
          }
        } else {
          return {
            error: `Invalid action: ${action}`,
            logs,
          }
        }
      } catch (error) {
        if (error instanceof GaxiosError) {
          if (error.status === 401) {
            throw new TokenVaultError(`Authorization required to access the Federated Connection`)
          }
        }
        console.error("Error in Gmail tool:", error)
        throw error
      }
    },
  })
)

function makeRawEmail(to: string | undefined, subject: string, body: string, cc?: string[] | null) {
  const messageParts = [
    to ? `To: ${to}` : "",
    cc && cc.length > 0 ? `Cc: ${cc.join(", ")}` : "",
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
    "",
    body,
  ].filter(Boolean)

  const message = messageParts.join("\n")
  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
  return encodedMessage
}
