import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"
import { Client } from "@microsoft/microsoft-graph-client"

import { withOneDrive } from "../../../auth0-ai/windows-live"

const flexibleDateTime = z.string().refine(val => !isNaN(Date.parse(val)), {
  message: "Invalid datetime format",
})

const toolSchema = z.object({
  //timeMin: z.string().datetime().describe("Start time in ISO 8601 format"),
  //timeMax: z.string().datetime().describe("End time in ISO 8601 format"),
  timeMin: flexibleDateTime,
  timeMax: flexibleDateTime,
  timeZone: z
    .string()
    .optional()
    .nullable()
    .default("US/Central")
    .describe("Time zone to use for the calendar"),
})

export const MicrosoftCalendarReadTool = withOneDrive(
  tool({
    description: "Check a user's schedule between the given date times on their Microsoft calendar",
    parameters: toolSchema,
    execute: async ({ timeMin, timeMax, timeZone = "US/Central" }) => {
      // Get the access token from Auth0 AI
      const access_token = getAccessTokenForConnection()

      try {
        const client = Client.initWithMiddleware({
          authProvider: {
            getAccessToken: async () => {
              return access_token
            },
          },
        })

        const items = await client
          .api("/me/calendarview")
          .header("Prefer", `outlook.timezone="${timeZone || "UTC"}"`)
          .query({
            startDateTime: timeMin,
            endDateTime: timeMax,
            orderby: "start/dateTime",
          })
          .get()

        return items
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
