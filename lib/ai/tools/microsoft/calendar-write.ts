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
  subject: z.string().describe("The title of the event"),
  startDateTime: flexibleDateTime,
  endDateTime: flexibleDateTime,
  timeZone: z
    .string()
    .optional()
    .nullable()
    .default("US/Central")
    .describe("Time zone for the event"),
  location: z.string().optional().nullable().describe("Location of the event"),
  attendees: z.array(z.string()).optional().nullable().describe("Email addresses of attendees"),
  eventId: z.string().optional().nullable().describe("Event ID for updating existing events"),
})

export const MicrosoftCalendarWriteTool = withOneDrive(
  tool({
    description:
      "Create or update an event in the user's Microsoft calendar. Provide eventId to update an existing event.",
    parameters: toolSchema,
    execute: async ({
      subject,
      startDateTime,
      endDateTime,
      timeZone = "UTC",
      location,
      attendees = [],
      eventId,
    }) => {
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

        const event = {
          subject,
          start: {
            dateTime: startDateTime,
            timeZone,
          },
          end: {
            dateTime: endDateTime,
            timeZone,
          },
          location: location ? { displayName: location } : undefined,
          attendees:
            attendees?.map(email => ({
              emailAddress: { address: email },
              type: "required",
            })) || [],
        }

        if (eventId) {
          await client.api(`/me/events/${eventId}`).patch(event)
          return {
            status: "success",
            message: `Event "${subject}" updated successfully`,
          }
        } else {
          await client.api("/me/events").post(event)
          return {
            status: "success",
            message: `Event "${subject}" created successfully from ${startDateTime} to ${endDateTime}`,
          }
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
