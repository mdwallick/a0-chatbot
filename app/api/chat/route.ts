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
    WebSearchTool,
    XboxUserProfileTool,
    XboxAchievementTool,
  }

  const trimmedMessages = trimMessages(messages, {
    keepSystem: true,
    maxMessages: 12,
  })
  const systemTemplate = await getSystemTemplate(isAuthenticated)
  const now = new Date().toLocaleString("en-US", { timeZone: "US/Central" })

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

    console.log("# of messages", messages.length)
    if (thread.summary === "New conversation" && messages.length >= 3) {
      console.log("we have 3 messages, create a thread title (summary)")
      const recentMessages = messages.slice(-3)

      const summary = await summarizeThread(
        recentMessages.reverse().map(m => ({
          role: m.role, // e.g. "user" or "assistant"
          content: m.content,
        }))
      )
      console.log("summary", summary)

      await prisma.chatThread.update({
        where: { id },
        data: { summary },
      })
    }
  }

  return createDataStreamResponse({
    execute: withInterruptions(
      async dataStream => {
        const result = streamText({
          model: openai(process.env.OPENAI_MODEL || "gpt-4o"),
          system: `The current date and time is ${now}. ${systemTemplate}`,
          messages: trimmedMessages,
          maxSteps: 5,
          tools: isAuthenticated ? tools : {}, // Only provide tools if user is authenticated
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
        tools,
      }
    ),
    onError: errorSerializer(err => {
      console.error(err)
      return "Oops, an error occured!"
    }),
  })
}

async function getSystemTemplate(isAuthenticated: boolean) {
  const authenticatedCapabilities = `
Available integrations for authenticated users:
- Google Drive: Search, list, read, and manage files and folders (Use google_drive_list_files to list files, google_drive_get_file to read file content)
- OneDrive: Access and manage files
- Salesforce: Search and manage CRM records

You can offer these integration features only when the user is authenticated.
`

  const baseTemplate = `
You are a friendly assistant! Keep your responses concise and helpful.

When providing a date or time, always output the value in full ISO 8601 format using UTC (e.g. "2025-05-24T19:00:00Z"). Use 24-hour time and include seconds.
Only return properly formatted ISO 8601 strings for all datetime fields like startDateTime or endDateTime.


${
  isAuthenticated
    ? authenticatedCapabilities
    : "NOTE: The user is not logged in. You can only provide basic chat functionality. To use integrations with services like Google Drive, OneDrive, Salesforce, etc., the user needs to log in first."
}

TOOL SELECTION RULES:
1. You can use the 'WebSearchTool' tool to get up-to-date web information. When presenting results to the user, format them in numbered Markdown list with clickable links and brief summaries.
2. Only use tools that are directly relevant to the user's request
3. Do not use calendar tools unless explicitly asked about calendar/schedule/meetings
4. Do not mix tools from different services unless specifically requested
${
  isAuthenticated
    ? "4. You have access to all integration tools since the user is authenticated"
    : "4. DO NOT offer or suggest using any integration tools since the user is not authenticated - instead, inform them they need to log in first"
}

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
