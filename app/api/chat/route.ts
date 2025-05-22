import { createDataStreamResponse, Message, streamText } from "ai"

import { googleDriveTools } from "@/lib/ai/tools"
import {
  GmailReadTool,
  GmailSendTool,
  GoogleCalendarReadTool,
  GoogleCalendarWriteTool,
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

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message>; selectedChatModel: string } =
    await request.json()

  setAIContext({ threadID: id })

  const session = await auth0.getSession()
  const isAuthenticated = !!session?.user

  const tools = {
    GmailReadTool,
    GmailSendTool,
    GoogleCalendarReadTool,
    GoogleCalendarWriteTool,
    ...googleDriveTools,
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

  const trimmedMessages = trimMessages(messages, {
    keepSystem: true,
    maxMessages: 12,
  })
  const systemTemplate = await getSystemTemplate(isAuthenticated)
  const now = new Date().toLocaleString("en-US", { timeZone: "US/Central" })

  return createDataStreamResponse({
    execute: withInterruptions(
      async dataStream => {
        const result = streamText({
          model: openai(process.env.OPENAI_MODEL || "gpt-4o"),
          system: `The current date and time is ${now}. ${systemTemplate}`,
          messages: trimmedMessages,
          maxSteps: 5,
          tools: isAuthenticated ? tools : {}, // Only provide tools if user is authenticated
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
- Slack: List and search channels
- Box: Access and manage files

You can offer these integration features only when the user is authenticated.

IMPORTANT - WHICH TOOLS TO USE:
Take into account the services the user has linked to their account. For example, if the user has only linked their Google account, then only use the Google Drive tools if they ask about their files or documents.
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
1. Only use tools that are directly relevant to the user's request
2. Do not use calendar tools unless explicitly asked about calendar/schedule/meetings
3. Do not mix tools from different services unless specifically requested
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
