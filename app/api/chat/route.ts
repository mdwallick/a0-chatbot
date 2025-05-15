import { createDataStreamResponse, Message, streamText } from "ai";

import { boxTools, checkUsersCalendar, googleDriveTools, listChannels } from "@/lib/ai/tools";
import {
  MicrosoftCalendarReadTool,
  MicrosoftCalendarWriteTool,
  MicrosoftFilesListTool,
  MicrosoftFilesReadTool,
  MicrosoftFilesWriteTool,
  MicrosoftMailReadTool,
  MicrosoftMailWriteTool,
} from "@/lib/ai/tools/microsoft";
import { SalesforceCreateTool, SalesforceQueryTool } from "@/lib/ai/tools/salesforce";
import { auth0 } from "@/lib/auth0";
import { openai } from "@ai-sdk/openai";
import { setAIContext } from "@auth0/ai-vercel";
import { errorSerializer, withInterruptions } from "@auth0/ai-vercel/interrupts";

async function getSystemTemplate(isAuthenticated: boolean) {
  const authenticatedCapabilities = `
Available integrations for authenticated users:
- Google Drive: Search, list, read, and manage files and folders
- OneDrive: Access and manage files
- Salesforce: Search and manage CRM records
- Slack: List and search channels
- Box: Access and manage files
- Calendar tools: Check and manage calendar events
- Email tools: Read and send emails

You can offer these integration features only when the user is authenticated.`

  const baseTemplate = `
You are a friendly assistant! Keep your responses concise and helpful.

${isAuthenticated ? authenticatedCapabilities : "NOTE: The user is not logged in. You can only provide basic chat functionality. To use integrations with services like Google Drive, OneDrive, Salesforce, etc., the user needs to log in first."}

TOOL SELECTION RULES:
1. Only use tools that are directly relevant to the user's request
2. Do not use calendar tools unless explicitly asked about calendar/schedule/meetings
3. Do not mix tools from different services unless specifically requested
${isAuthenticated ? "4. You have access to all integration tools since the user is authenticated" : "4. DO NOT offer or suggest using any integration tools since the user is not authenticated - instead, inform them they need to log in first"}

IMPORTANT: For data modification operations:
1. Call the tool exactly once
2. Wait for the response
3. Do not retry on failure
4. Report the result to the user

Current time information:
- Current date and time: ${new Date().toLocaleString("en-US", {
    timeZone: "US/Central",
  })} US/Central
- Current ISO timestamp: ${new Date().toISOString()}
`

  return baseTemplate
}

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message>; selectedChatModel: string } =
    await request.json()

  setAIContext({ threadID: id })

  // Check if user is authenticated
  const session = await auth0.getSession()
  const isAuthenticated = !!session?.user

  const tools = {
    boxTools,
    MicrosoftMailReadTool,
    MicrosoftMailWriteTool,
    MicrosoftCalendarReadTool,
    MicrosoftCalendarWriteTool,
    MicrosoftFilesReadTool,
    MicrosoftFilesListTool,
    MicrosoftFilesWriteTool,
    SalesforceQueryTool,
    SalesforceCreateTool,
    checkUsersCalendar,
    listChannels,
    ...googleDriveTools,
  }

  const systemTemplate = await getSystemTemplate(isAuthenticated)

  return createDataStreamResponse({
    execute: withInterruptions(
      async dataStream => {
        const result = streamText({
          model: openai(process.env.OPENAI_MODEL || "gpt-4"),
          system: systemTemplate,
          messages,
          maxSteps: 5,
          tools: isAuthenticated ? tools : {}, // Only provide tools if user is authenticated
        })

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        })
      },
      {
        messages,
        tools: isAuthenticated ? tools : {}, // Only provide tools if user is authenticated
      }
    ),
    onError: errorSerializer(err => {
      console.error(err)
      return "Oops, an error occurred!"
    }),
  })
}
