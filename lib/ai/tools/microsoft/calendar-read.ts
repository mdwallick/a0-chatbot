import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { TokenVaultError } from "@auth0/ai/interrupts"
import { Client } from "@microsoft/microsoft-graph-client"

import { withMSCalendarRead } from "@/lib/auth0-ai/microsoft"
import { Event } from "@microsoft/microsoft-graph-types"
import { debugGetAccessToken } from "@/lib/debug-token-helper"

// Your calendar query will return this type
interface CalendarResponse {
  value: Event[]
  "@odata.nextLink"?: string
}

const flexibleDateTime = z.string().refine(val => !isNaN(Date.parse(val)), {
  message: "Invalid datetime format",
})

const toolSchema = z.object({
  timeMin: flexibleDateTime,
  timeMax: flexibleDateTime,
  timeZone: z
    .string()
    .optional()
    .nullable()
    .default("US/Central")
    .describe("Time zone to use for the calendar"),
})

export const MicrosoftCalendarReadTool = withMSCalendarRead(
  tool({
    description: "Check a user's schedule between the given date times on their Microsoft calendar",
    inputSchema: toolSchema,
    execute: async ({ timeMin, timeMax, timeZone = "US/Central" }) => {
      const logs = []

      // Get the access token from Auth0 AI with debug logging
      const access_token = debugGetAccessToken("windowslive/Microsoft")
      logs.push("got access token from token vault")

      try {
        const client = Client.initWithMiddleware({
          authProvider: {
            getAccessToken: async () => {
              return access_token
            },
          },
        })

        logs.push(`searching calendar from ${timeMin} to ${timeMax}`)
        const items: CalendarResponse = await client
          .api("/me/calendarview")
          .header("Prefer", `outlook.timezone="${timeZone || "UTC"}"`)
          .query({
            startDateTime: timeMin,
            endDateTime: timeMax,
            orderby: "start/dateTime",
          })
          .get()
        logs.push(`Found ${items?.value?.length || 0} events`)
        return {
          logs,
          items,
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
