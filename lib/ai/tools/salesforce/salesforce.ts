import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { Connection } from "jsforce"
import { z } from "zod"

import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel"
import { TokenVaultError } from "@auth0/ai/interrupts"

import { withSalesforce } from "@/lib/auth0-ai/salesforce"

const toolSchema = z.object({
  action: z
    .enum(["search", "query"])
    .describe("Action: 'search' for SOSL text search, 'query' for SOQL queries"),
  searchTerm: z
    .string()
    .optional()
    .nullable()
    .describe("Search term for SOSL search (required for search action)"),
  query: z.string().optional().nullable().describe("SOQL query string (required for query action)"),
  scope: z
    .array(z.string())
    .optional()
    .nullable()
    .describe("Object types to search within for search action (e.g., Account, Contact)"),
})

export const SalesforceTool = withSalesforce(
  tool({
    description:
      "Search and query Salesforce CRM records. Use action 'search' for SOSL text search across objects, or 'query' for SOQL structured queries.",
    inputSchema: toolSchema,
    execute: async ({ action, searchTerm, query, scope }) => {
      const logs: string[] = []

      // Get the access token from Auth0 AI
      const access_token = getAccessTokenFromTokenVault()
      logs.push("got access token from token vault")

      if (!access_token) {
        logs.push("access token missing or expired")
        throw new TokenVaultError("Authorization required to access Salesforce")
      }

      try {
        const client = new Connection({
          instanceUrl: process.env.SALESFORCE_LOGIN_URL,
          accessToken: access_token,
        })

        if (action === "search") {
          if (!searchTerm) {
            return {
              action: "search",
              status: "error",
              message: "searchTerm is required for search action",
            }
          }

          logs.push(`Searching ${scope ? scope.join(", ") : "all objects"} for "${searchTerm}"`)
          const soslQuery = `FIND {${searchTerm}}${scope ? ` IN ALL FIELDS RETURNING ${scope.join(",")}` : ""}`
          const result = await client.search(soslQuery)

          return {
            action: "search",
            status: "success",
            logs,
            totalSize: result.searchRecords.length,
            records: result.searchRecords,
          }
        } else if (action === "query") {
          if (!query) {
            return {
              action: "query",
              status: "error",
              message: "query is required for query action",
            }
          }

          logs.push(`Running SOQL query: ${query}`)
          const result = await client.query(query)

          return {
            action: "query",
            status: "success",
            logs,
            totalSize: result.totalSize,
            records: result.records,
          }
        }

        return {
          status: "error",
          message: `Unknown action: ${action}`,
        }
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
