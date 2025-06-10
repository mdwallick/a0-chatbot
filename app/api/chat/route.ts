import { createDataStreamResponse, Message, streamText } from "ai"

import { WebSearchTool } from "@/lib/ai/tools"
import {
  GmailReadTool,
  GmailSendTool,
  GoogleFilesListTool,
  GoogleCalendarReadTool,
  GoogleCalendarWriteTool,
  GoogleFilesReadTool,
  GoogleFilesWriteTool,
} from "@/lib/ai/tools/google"

import {
  MicrosoftCalendarReadTool,
  MicrosoftCalendarWriteTool,
  MicrosoftFilesListTool,
  MicrosoftFilesReadTool,
  MicrosoftFilesWriteTool,
  MicrosoftMailReadTool,
  MicrosoftMailSendTool,
} from "@/lib/ai/tools/microsoft"
import { XboxUserProfileTool, XboxAchievementTool } from "@/lib/ai/tools/xbox"
import { SalesforceQueryTool, SalesforceSearchTool } from "@/lib/ai/tools/salesforce"

import { auth0 } from "@/lib/auth0"
import { openai } from "@ai-sdk/openai"
import { setAIContext } from "@auth0/ai-vercel"
import { errorSerializer, withInterruptions } from "@auth0/ai-vercel/interrupts"

import { trimMessages } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { summarizeThread } from "@/lib/summarize-thread"

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message>; selectedChatModel: string } =
    await request.json()

  setAIContext({ threadID: id })

  const session = await auth0.getSession()
  const isAuthenticated = !!session?.user

  const tools = {
    WebSearchTool,
    GmailReadTool,
    GmailSendTool,
    GoogleFilesListTool,
    GoogleCalendarReadTool,
    GoogleCalendarWriteTool,
    GoogleFilesReadTool,
    GoogleFilesWriteTool,
    MicrosoftCalendarReadTool,
    MicrosoftCalendarWriteTool,
    MicrosoftFilesListTool,
    MicrosoftFilesReadTool,
    MicrosoftFilesWriteTool,
    MicrosoftMailReadTool,
    MicrosoftMailSendTool,
    SalesforceQueryTool,
    SalesforceSearchTool,
    XboxUserProfileTool,
    XboxAchievementTool,
  }

  if (isAuthenticated) {
    // only save the message if the user is authenticated
    const thread = await prisma.chatThread.upsert({
      where: { id },
      update: {}, // no update needed
      create: {
        id,
        userId: session!.user.sub,
      },
    })

    await prisma.message.create({
      data: {
        role: "user",
        content: messages[messages.length - 1].content,
        threadId: id,
      },
    })

    if (thread.summary === "New conversation" && messages.length > 1) {
      const recentMessages = messages.slice(-2)

      const summary = await summarizeThread(
        recentMessages.reverse().map(m => ({
          role: m.role, // e.g. "user" or "assistant"
          content: m.content,
        }))
      )

      await prisma.chatThread.update({
        where: { id },
        data: { summary },
      })
    }
  }

  const trimmedMessages = trimMessages(messages, {
    keepSystem: true,
    maxMessages: 12,
  })
  const systemTemplate = await getSystemTemplate()
  const now = new Date().toLocaleString("en-US", { timeZone: "US/Central" })

  return createDataStreamResponse({
    execute: withInterruptions(
      async dataStream => {
        const result = streamText({
          model: openai(process.env.OPENAI_MODEL || "gpt-4o"),
          system: `The current date and time is ${now}. ${systemTemplate}`,
          messages: trimmedMessages,
          maxSteps: 5,
          tools: tools,
          async onFinish(finalResult) {
            if (isAuthenticated) {
              // only save the message if the user is authenticated
              await prisma.message.create({
                data: {
                  role: "assistant",
                  content: finalResult.text,
                  threadId: id,
                },
              })
            }
          },
        })

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        })
      },
      {
        messages,
        tools: tools,
      }
    ),
    onError: errorSerializer(err => {
      console.error(err)
      return "Oops, an error occured!"
    }),
  })
}

async function getSystemTemplate() {
  const baseTemplate = `
You are a friendly assistant! Keep your responses concise and helpful.

Available integrations:
- Google: Gmail, Google Calendar, and Google Drive files and folders
- Microsoft: Outlook email, calendar and OneDrive files and folders
- Salesforce: Search CRM records e.g. accounts, contacts, opportunities
- Xbox: read player profile and achievements

TOOL SELECTION RULES:
1. Use the 'WebSearchTool' tool to get up-to-date web information. When presenting results to the user, format them in numbered Markdown list with clickable links and brief summaries. Include images whenever possible.
2. Only use tools that are directly relevant to the user's request.
3. Do not use calendar tools unless explicitly asked about calendar/schedule/meetings
4. Do not mix tools from different services unless specifically requested

When providing a date or time, always output the value in full ISO 8601 format using UTC (e.g. "2025-05-24T19:00:00Z"). Use 24-hour time and include seconds.
Only return properly formatted ISO 8601 strings for all datetime fields like startDateTime or endDateTime.

REASONING AND NARRATION INSTRUCTIONS:
Always narrate your reasoning when deciding what to do.

If using a tool:
- Explain briefly why you chose that tool
- Mention any key steps taken (e.g. checking auth, refreshing tokens, handling errors)
- Show your thought process in a helpful and friendly way

If a tool returns logs, summarize any important details for the user.

Examples:
- “You're logged into Google — I'll query your calendar using the Google Calendar tool.”
- “Your token expired, so I'm refreshing it now... all set.”
- “Now searching your Drive for files containing 'Q2 report' in the name.”
`

  return baseTemplate
}
