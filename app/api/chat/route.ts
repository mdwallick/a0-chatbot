import { createDataStreamResponse, Message, streamText } from "ai"

import { boxTools, checkUsersCalendar, googleDriveTools, listChannels } from "@/lib/ai/tools"

import {
  MicrosoftMailReadTool,
  MicrosoftMailWriteTool,
  MicrosoftCalendarReadTool,
  MicrosoftCalendarWriteTool,
  MicrosoftFilesReadTool,
  MicrosoftFilesListTool,
  MicrosoftFilesWriteTool,
} from "@/lib/ai/tools/microsoft"

import { SalesforceQueryTool, SalesforceCreateTool } from "@/lib/ai/tools/salesforce"

import { openai } from "@ai-sdk/openai"
import { setAIContext } from "@auth0/ai-vercel"
import { errorSerializer, withInterruptions } from "@auth0/ai-vercel/interrupts"

const AGENT_SYSTEM_TEMPLATE = `
You are a friendly assistant! Keep your responses concise and helpful.

TOOL SELECTION RULES:
1. Only use tools that are directly relevant to the user's request
2. Do not use calendar tools unless explicitly asked about calendar/schedule/meetings
3. Do not mix tools from different services unless specifically requested

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

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message>; selectedChatModel: string } =
    await request.json()

  setAIContext({ threadID: id })

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

  return createDataStreamResponse({
    execute: withInterruptions(
      async dataStream => {
        const result = streamText({
          model: openai(process.env.OPENAI_MODEL || "gpt-4o"),
          system: AGENT_SYSTEM_TEMPLATE,
          messages,
          maxSteps: 5,
          tools,
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
