import { createDataStreamResponse, Message, streamText } from "ai"

import { boxTools, checkUsersCalendar, googleDriveTools, listChannels } from "@/lib/ai/tools"
import { listOneDriveFiles } from "@/lib/ai/tools/microsoft"
import { SalesforceQueryTool, SalesforceSearchTool } from "@/lib/ai/tools/salesforce"
import { auth0 } from "@/lib/auth0"
import { openai } from "@ai-sdk/openai"
import { setAIContext } from "@auth0/ai-vercel"
import { errorSerializer, withInterruptions } from "@auth0/ai-vercel/interrupts"

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message>; selectedChatModel: string } =
    await request.json()

  setAIContext({ threadID: id })

  const session = await auth0.getSession()
  const isAuthenticated = !!session?.user

  const tools = {
    boxTools,
    listOneDriveFiles,
    checkUsersCalendar,
    listChannels,
    ...googleDriveTools,
    SalesforceQueryTool,
    SalesforceSearchTool,
  }

  const systemTemplate = await getSystemTemplate(isAuthenticated)

  return createDataStreamResponse({
    execute: withInterruptions(
      async dataStream => {
        const result = streamText({
          model: openai(process.env.OPENAI_MODEL || "gpt-4o-mini"),
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
Take into account the services the user has linked to their account. 
For example, if the user has only linked their Google account, then only use the Google Drive tools if they ask about their files or documents.
`

  const baseTemplate = `
You are a friendly assistant! Keep your responses concise and helpful.

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

Current time information:
- Current date and time: ${new Date().toLocaleString("en-US", {
    timeZone: "US/Central",
  })} US/Central
- Current ISO timestamp: ${new Date().toISOString()}
`

  return baseTemplate
}
