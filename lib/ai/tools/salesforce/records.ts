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
      // Get the access token from Auth0 AI
      const access_token = getAccessTokenForConnection()

      try {
        const client = new Connection({
          instanceUrl: process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com",
          accessToken: access_token,
        })

        const result = await client.query(query)
        return {
          status: "success",
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
      // Get the access token from Auth0 AI
      const access_token = getAccessTokenForConnection()

      try {
        const client = new Connection({
          instanceUrl: process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com",
          accessToken: access_token,
        })

        const result = await client.sobject(objectType).create(data)
        return {
          status: "success",
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
