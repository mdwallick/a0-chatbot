import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { Connection } from "jsforce"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"

import { withSalesforce } from "../../../auth0-ai/salesforce"

const toolSchema = z.object({
  searchTerm: z.string().describe("The search term to look for"),
  scope: z
    .array(z.string())
    .optional()
    .nullable()
    .describe("Optional array of object types to search within"),
})

export const SalesforceSearchTool = withSalesforce(
  tool({
    description: "Query Salesforce records using SOQL",
    parameters: toolSchema,
    execute: async ({ searchTerm, scope }) => {
      const logs = []

      // Get the access token from Auth0 AI
      const access_token = getAccessTokenForConnection()
      logs.push("got access token from token vault")

      if (!access_token) {
        logs.push("access token missing or expired")
        throw new FederatedConnectionError("Authorization required to access Salesforce")
      }

      try {
        const client = new Connection({
          instanceUrl: process.env.SALESFORCE_LOGIN_URL,
          accessToken: access_token,
        })

        logs.push(`Searching ${scope} for ${searchTerm}`)
        const result = await client.search(
          `FIND {${searchTerm}}${scope ? ` IN ALL FIELDS RETURNING ${scope.join(",")}` : ""}`
        )
        return result.searchRecords
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
