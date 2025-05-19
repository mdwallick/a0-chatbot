import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"
import { Client } from "@microsoft/microsoft-graph-client"

import { withOneDrive } from "../../../auth0-ai/windows-live"

const toolSchema = z.object({
  query: z.string().optional().nullable().describe("Search query for the email subject or body"),
  top: z
    .number()
    .optional()
    .nullable()
    .default(5)
    .describe("Number of emails to return (default is 5)"),
  folder: z
    .enum(["inbox", "sentItems"])
    .optional()
    .nullable()
    .default("inbox")
    .describe("Folder to search in: inbox for received emails, sentItems for sent emails"),
})

type Email = {
  subject: string
  from?: {
    emailAddress: {
      name: string
      address: string
    }
  }
  receivedDateTime: string
  bodyPreview: string
  body: {
    contentType: string
    content: string
  }
  sender: {
    emailAddress: {
      name: string
      address: string
    }
  }
  toRecipients?: Array<{
    emailAddress: {
      name: string
      address: string
    }
  }>
  ccRecipients?: Array<{
    emailAddress: {
      name: string
      address: string
    }
  }>
}

export const MicrosoftMailReadTool = withOneDrive(
  tool({
    description: "Read Microsoft Outlook emails",
    parameters: toolSchema,
    execute: async ({ query, top: rawTop = 5, folder = "inbox" }) => {
      const logs = []
      const top = typeof rawTop === "number" ? rawTop : 5

      const access_token = getAccessTokenForConnection()
      logs.push("got access token from token vault")

      if (!access_token) {
        logs.push("access token missing or expired")
        throw new FederatedConnectionError("Authorization required to access OneDrive")
      }

      try {
        const client = Client.initWithMiddleware({
          authProvider: {
            getAccessToken: async () => {
              return access_token
            },
          },
        })

        const endpoint =
          folder === "sentItems"
            ? "/me/mailFolders/SentItems/messages"
            : "/me/mailFolders/Inbox/messages"

        const req = client.api(endpoint).top(top).orderby("receivedDateTime DESC")

        if (query) {
          req.query({ $search: `"${query}"` })
          logs.push(`Searching ${folder} for ${query}`)
        }

        const res = await req.get()

        const emails = res.value.map((email: Email) => {
          if (folder === "sentItems") {
            return {
              subject: email.subject,
              receivedDateTime: email.receivedDateTime,
              snippet: email.bodyPreview,
              body: email.body.content,
              type: "sent",
              recipients: email.toRecipients?.map(r => r.emailAddress.address) || [],
              ccRecipients: email.ccRecipients?.map(r => r.emailAddress.address) || [],
            }
          } else {
            return {
              subject: email.subject,
              receivedDateTime: email.receivedDateTime,
              snippet: email.bodyPreview,
              body: email.body.content,
              type: "received",
              from: email.from?.emailAddress?.address,
              sender: email.sender?.emailAddress?.address,
            }
          }
        })
        logs.push(`Got ${emails.length} emails from the ${folder} folder.`)
        return emails
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
