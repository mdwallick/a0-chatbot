import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel"
import { TokenVaultError } from "@auth0/ai/interrupts"
import { Client } from "@microsoft/microsoft-graph-client"

import { withMSMailSend } from "@/lib/auth0-ai/microsoft"

const toolSchema = z.object({
  subject: z.string().describe("Subject of the email"),
  body: z.string().describe("Body content of the email (can include HTML)"),
  to: z.array(z.string()).describe("Array of recipient email addresses"),
  cc: z.array(z.string()).optional().nullable().describe("Array of CC recipient email addresses"),
  importance: z
    .enum(["low", "normal", "high"])
    .optional()
    .nullable()
    .default("normal")
    .describe("Importance of the email"),
})

export const MicrosoftMailSendTool = withMSMailSend(
  tool({
    description: "Write/Send Microsoft Outlook emails",
    inputSchema: toolSchema,
    execute: async ({ subject, body, to, cc, importance = "normal" }) => {
      const access_token = getAccessTokenFromTokenVault()

      try {
        const client = Client.initWithMiddleware({
          authProvider: {
            getAccessToken: async () => {
              return access_token
            },
          },
        })

        const message = {
          subject,
          body: {
            contentType: "HTML",
            content: body,
          },
          toRecipients: to.map(email => ({
            emailAddress: { address: email },
          })),
          ccRecipients:
            cc?.map(email => ({
              emailAddress: { address: email },
            })) || [],
          importance,
        }

        await client.api("/me/sendMail").post({ message })

        return JSON.stringify({
          status: "success",
          message: `Email "${subject}" sent successfully to ${to.join(", ")}`,
        })
      } catch (error) {
        if (error instanceof GaxiosError) {
          if (error.status === 401) {
            throw new TokenVaultError(`Authorization required to access the Federated Connection`)
          }
        }

        throw error
      }
    },
  })
)
