import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"
import { google } from "googleapis"

import { getGoogleAuth, withGoogleCalendarRead } from "@/lib/auth0-ai/google"

const toolSchema = z.object({
  timeMin: z.string().datetime().describe("Start time in ISO 8601 format"),
  timeMax: z.string().datetime().describe("End time in ISO 8601 format"),
})

export const GoogleCalendarReadTool = withGoogleCalendarRead(
  tool({
    description: "Check a user's schedule between the given date times on their Google calendar",
    parameters: toolSchema,
    execute: async ({ timeMin, timeMax }) => {
      const logs = []

      // Get the access token from Auth0 AI
      const access_token = getAccessTokenForConnection()
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

        const items = response?.data?.items
        logs.push(`Found ${items?.length || 0} events`)
        return {
          status: "success",
          logs,
          startDate: timeMin,
          endDate: timeMax,
          events: items,
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
