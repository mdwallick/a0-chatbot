import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel"
import { TokenVaultError } from "@auth0/ai/interrupts"
import { google, calendar_v3 } from "googleapis"

import { getGoogleAuth, withGoogleCalendarRead } from "@/lib/auth0-ai/google"

// Sanitized event structure for ZDR compliance - omits PII and sensitive content
interface SanitizedEvent {
  id: string
  summary: string
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
function sanitizeEvents(events: calendar_v3.Schema$Event[]): SanitizedEvent[] {
  return events.map(event => ({
    id: event.id || "",
    summary: event.summary || "(No subject)",
    start: event.start?.dateTime || event.start?.date || "",
    end: event.end?.dateTime || event.end?.date || "",
    location: event.location || undefined,
    attendeeCount: event.attendees?.length || 0,
    isAllDay: !event.start?.dateTime, // All-day events use date instead of dateTime
    status: event.status || undefined,
  }))
}

const toolSchema = z.object({
  timeMin: z.string().datetime().describe("Start time in ISO 8601 format"),
  timeMax: z.string().datetime().describe("End time in ISO 8601 format"),
})

export const GoogleCalendarReadTool = withGoogleCalendarRead(
  tool({
    description: "Check a user's schedule between the given date times on their Google calendar",
    inputSchema: toolSchema,
    execute: async ({ timeMin, timeMax }) => {
      const logs = []

      // Get the access token from Auth0 AI
      const access_token = getAccessTokenFromTokenVault()
      logs.push("got access token from token vault")

      // Create Google OAuth client.
      const auth = getGoogleAuth(access_token)

      try {
        logs.push(`searching calendar from ${timeMin} to ${timeMax}`)
        const calendar = google.calendar({ version: "v3", auth })

        // Get calendar events for given query.
        const response = await calendar.events.list({
          calendarId: "primary",
          timeMin,
          timeMax,
          maxResults: 50,
          singleEvents: true,
          orderBy: "startTime",
        })

        // Sanitize events to remove PII for ZDR compliance
        const events = sanitizeEvents(response?.data?.items || [])
        logs.push(`Found ${events.length} events`)

        return {
          status: "success",
          logs,
          startDate: timeMin,
          endDate: timeMax,
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
