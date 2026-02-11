import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel"
import { TokenVaultError } from "@auth0/ai/interrupts"
import { google } from "googleapis"

import { getGoogleAuth, withGoogleCalendarWrite } from "@/lib/auth0-ai/google"

const toolSchema = z.object({
  summary: z.string().describe("A short summary or the title of the event"),
  description: z
    .string()
    .optional()
    .nullable()
    .describe("A more detailed description of the event"),
  startDateTime: z
    .string()
    .datetime()
    .describe("Start time in ISO 8601 format using UTC, e.g. 2025-05-24T19:00:00Z"),
  endDateTime: z
    .string()
    .datetime()
    .describe("End time in ISO 8601 format using UTC, e.g. 2025-05-24T19:00:00Z"),
  location: z.string().optional().nullable().describe("Location of the event"),
  attendees: z.array(z.string()).optional().nullable().describe("Email addresses of attendees"),
  eventId: z.string().optional().nullable().describe("Event ID for updating existing events"),
})

export const GoogleCalendarWriteTool = withGoogleCalendarWrite(
  tool({
    description:
      "Create or update an event in the user's Google calendar. Provide eventId to update an existing event.",
    inputSchema: toolSchema,
    execute: async ({
      summary,
      description,
      startDateTime,
      endDateTime,
      location,
      attendees = [],
      eventId,
    }) => {
      const logs = []

      // Get the access token from Auth0 AI
      const access_token = getAccessTokenFromTokenVault()
      const auth = getGoogleAuth(access_token)

      try {
        const event = {
          summary,
          location: location || undefined,
          description,
          start: {
            dateTime: startDateTime,
          },
          end: {
            dateTime: endDateTime,
          },
          attendees: attendees?.map(email => ({ email })) || [],
          reminders: {
            useDefault: true,
          },
        }

        logs.push("create event", event)
        const calendar = google.calendar({ version: "v3", auth })

        if (eventId) {
          const response = await calendar.events.update({
            calendarId: "primary",
            eventId,
            requestBody: event,
            sendUpdates: "all", // important! sends email invites to attendees
          })
          return response.data
        } else {
          const response = await calendar.events.insert({
            calendarId: "primary",
            requestBody: event,
            sendUpdates: "all", // important! sends email invites to attendees
          })
          return response.data
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
