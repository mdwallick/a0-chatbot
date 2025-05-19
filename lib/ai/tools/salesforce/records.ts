import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"

import { withSalesforce } from "../../../auth0-ai/salesforce"

import { Connection } from "jsforce"

const querySchema = z.object({
  query: z.string().describe("The SOQL query to execute"),
})

export const SalesforceQueryTool = withSalesforce(
  tool({
    description: "Query Salesforce records using SOQL",
    parameters: querySchema,
    execute: async ({ query }) => {
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

        logs.push(`running query ${query}`)
        const result = await client.query(query)
        return {
          status: "success",
          logs,
          totalSize: result.totalSize,
          records: result.records,
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

const createSchema = z.object({
  objectType: z.string().describe("The Salesforce object type (e.g., Account, Contact)"),
  data: z.record(z.any()).describe("The record data to create"),
})

export const SalesforceCreateTool = withSalesforce(
  tool({
    description: "Create a new record in Salesforce",
    parameters: createSchema,
    execute: async ({ objectType, data }) => {
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

        logs.push(`creating ${objectType} with data ${data}`)
        const result = await client.sobject(objectType).create(data)
        return {
          status: "success",
          logs,
          id: result.id,
          success: result.success,
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
