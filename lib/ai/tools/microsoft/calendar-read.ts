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

// Sanitized event structure for ZDR compliance - omits PII and sensitive content
interface SanitizedEvent {
  id: string
  subject: string
  start: string
  end: string
  location?: string
  attendeeCount: number
  isAllDay: boolean
  status?: string
}

/**
 * Sanitize calendar events to remove PII and sensitive content.
 * This enables ZDR (Zero Data Retention) compliance by not sending
 * email addresses, meeting descriptions, or other sensitive data to the model.
 */
function sanitizeEvents(events: Event[]): SanitizedEvent[] {
  return events.map(event => ({
    id: event.id || "",
    subject: event.subject || "(No subject)",
    start: event.start?.dateTime || "",
    end: event.end?.dateTime || "",
    location: event.location?.displayName || undefined,
    attendeeCount: event.attendees?.length || 0,
    isAllDay: event.isAllDay || false,
    status: event.showAs || undefined,
  }))
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
        const response: CalendarResponse = await client
          .api("/me/calendarview")
          .header("Prefer", `outlook.timezone="${timeZone || "UTC"}"`)
          .query({
            startDateTime: timeMin,
            endDateTime: timeMax,
            orderby: "start/dateTime",
          })
          .get()

        // Sanitize events to remove PII for ZDR compliance
        const events = sanitizeEvents(response?.value || [])
        logs.push(`Found ${events.length} events`)

        return {
          logs,
          events,
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
