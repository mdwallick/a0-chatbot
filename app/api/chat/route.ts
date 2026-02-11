import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  stepCountIs,
  UIMessage,
} from "ai"

import { DalleImageTool, WebSearchTool, ProductSearchTool, CheckoutTool } from "@/lib/ai/tools"
import {
  GmailReadTool,
  GmailSendTool,
  GoogleFilesListTool,
  GoogleCalendarReadTool,
  GoogleCalendarWriteTool,
  GoogleFilesReadTool,
  GoogleFilesWriteTool,
  GoogleFolderCreateTool,
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
import { openai } from "@/lib/openai"
import { setAIContext } from "@auth0/ai-vercel"
import { errorSerializer, withInterruptions } from "@auth0/ai-vercel/interrupts"

import { trimMessages, getMessageText } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { summarizeThread } from "@/lib/summarize-thread"
import { getImageCountToday, getImageCreationLimit } from "@/lib/utils"

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<UIMessage>; selectedChatModel: string } =
    await request.json()

  setAIContext({ threadID: id })

  const session = await auth0.getSession()
  const isAuthenticated = !!session?.user

  const context = {
    user: session?.user
      ? {
          id: session.user.sub,
          email: session.user.email,
          name: session.user.name,
        }
      : undefined,
  }

  const toolDefinitions = {
    DalleImageTool,
    WebSearchTool,
    ProductSearchTool,
    CheckoutTool,
    GmailReadTool,
    GmailSendTool,
    GoogleFilesListTool,
    GoogleCalendarReadTool,
    GoogleCalendarWriteTool,
    GoogleFilesReadTool,
    GoogleFilesWriteTool,
    GoogleFolderCreateTool,
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

  const tools = Object.fromEntries(
    Object.entries(toolDefinitions).map(([name, definition]) => {
      if (typeof definition === "function") {
        return [name, definition(context)]
      }
      return [name, definition]
    })
  )

  if (isAuthenticated) {
    await prisma.chatThread.upsert({
      where: { id },
      update: {},
      create: {
        id,
        userId: session!.user.sub,
      },
    })

    // Get the last user message content
    const lastMessage = messages[messages.length - 1]
    const messageContent = getMessageText(lastMessage)

    await prisma.message.create({
      data: {
        role: "user",
        content: messageContent,
        parts: lastMessage.parts as any, // Store full UIMessage parts for rich history
        threadId: id,
      },
    })
  }

  const trimmedMessages = trimMessages(messages, {
    keepSystem: true,
    maxMessages: 12,
  })

  let imageUsageCount: number | undefined = undefined

  if (isAuthenticated && context.user?.id) {
    imageUsageCount = await getImageCountToday(context.user.id)
  }

  const systemTemplate = await getSystemTemplate({
    userName: context.user?.name?.split(" ")[0],
    userEmail: context.user?.email,
    imageUsageCount,
    isAuthenticated,
  })
  const now = new Date().toLocaleString("en-US", { timeZone: "US/Central" })

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: withInterruptions(
      async ({ writer }) => {
        const result = streamText({
          model: openai(process.env.OPENAI_MODEL || "gpt-4o-mini"),
          system: `The current date and time is ${now}. ${systemTemplate}`,
          messages: await convertToModelMessages(trimmedMessages),
          tools,
          // Allow up to 5 steps for tool calls and responses
          stopWhen: stepCountIs(5),
          onStepFinish: async step => {
            // Check for tool errors after each step to trigger Auth0 interruption handling
            if (step.finishReason === "tool-calls") {
              for (const content of step.content) {
                if (content.type === "tool-error") {
                  const { toolName, toolCallId, error, input } = content as any
                  console.log("[Chat] Tool error detected:", { toolName, error: error?.message })
                  const serializableError = {
                    cause: error,
                    toolCallId: toolCallId,
                    toolName: toolName,
                    toolArgs: input,
                  }
                  throw serializableError
                }
              }
            }
          },
          onFinish: async output => {
            if (isAuthenticated) {
              // Save assistant response with parts
              await prisma.message.create({
                data: {
                  role: "assistant",
                  content: output.text,
                  parts: [{ type: "text", text: output.text }] as any,
                  threadId: id,
                },
              })

              // Auto-summarize after first complete exchange
              const thread = await prisma.chatThread.findUnique({
                where: { id },
                include: {
                  messages: {
                    orderBy: { createdAt: "asc" },
                    take: 4, // Get first few messages for summarization
                  },
                },
              })

              if (thread && thread.summary === "New conversation" && thread.messages.length >= 2) {
                // Check if we have at least one user and one assistant message
                const hasUser = thread.messages.some(m => m.role === "user")
                const hasAssistant = thread.messages.some(m => m.role === "assistant")

                if (hasUser && hasAssistant) {
                  console.log("[Chat] Auto-summarizing thread after first exchange")

                  const summary = await summarizeThread(
                    thread.messages.slice(0, 4).map(m => ({
                      role: m.role,
                      content: m.content,
                    }))
                  )

                  await prisma.chatThread.update({
                    where: { id },
                    data: { summary },
                  })
                }
              }
            }
          },
        })

        writer.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          })
        )
      },
      { messages, tools }
    ),
    onError: errorSerializer(err => {
      console.error(err)
      return "Oops, an error occured!"
    }),
  })

  return createUIMessageStreamResponse({ stream })
}

async function getSystemTemplate({
  userName,
  userEmail,
  imageUsageCount,
  isAuthenticated,
}: {
  userName?: string
  userEmail?: string
  imageUsageCount?: number
  isAuthenticated: boolean
}) {
  const maxPerDay = getImageCreationLimit()

  const baseTemplate = `
You are a friendly assistant! Keep your responses concise and helpful.

## USER CONTEXT
${
  isAuthenticated
    ? `
You're currently helping ${userName ?? "a user"}${userEmail ? ` (${userEmail})` : ""}.
The user is signed in and can access all available integrations.
`
    : `
The user is not signed in. Many features require authentication.
If they ask about calendar, email, files, or other personal data, politely suggest they sign in first.
You can still help with general questions, web searches, and information requests.
`
}

## AVAILABLE INTEGRATIONS
${
  isAuthenticated
    ? `
- **Google**: Read/send/draft Gmail, read/write Calendar events, create Google Docs/Sheets/folders, list/read/write Drive files
- **Microsoft**: Read/send Outlook mail, read/write Calendar events, list/read/write OneDrive files
- **Salesforce**: Search and query CRM records (accounts, contacts, opportunities, leads)
- **Xbox**: Read player profile, gamerscore, and achievement history
- **Commerce**: Search products and create checkout sessions
- **Web Search**: Search the internet for current information
- **Image Generation**: Create images with DALL-E (limit: ${maxPerDay}/day)
${typeof imageUsageCount === "number" ? `  - Images generated today: ${imageUsageCount}/${maxPerDay}` : ""}
`
    : `
- **Web Search**: Search the internet for current information
- **Commerce**: Search products and create checkout sessions
- **Image Generation**: Requires sign-in
- **Google/Microsoft/Salesforce/Xbox**: Requires sign-in
`
}

## AUTHORIZATION & CONSENT
When a tool requires authorization to an external service (Google, Microsoft, Salesforce, Xbox):
- The user will see a "Grant Access" prompt to authorize the connection
- Wait for them to complete the consent flow - do not repeatedly retry
- Once authorized, the tool will work automatically for future requests
- If authorization fails, explain clearly and suggest they try again or check their account settings

## TOOL SELECTION RULES
1. Only use tools directly relevant to the user's request
2. Do not use calendar tools unless explicitly asked about calendar/schedule/meetings
3. Do not use email tools unless explicitly asked about email/messages
4. Do not mix tools from different services (Google vs Microsoft) unless specifically requested
5. For web searches, format results as a numbered Markdown list with clickable links and brief summaries

## DATE & TIME HANDLING
- When calling tools, use ISO 8601 format in UTC (e.g., "2025-05-24T19:00:00Z")
- When displaying times to the user, show them in a friendly format with timezone context
- The user's current timezone appears to be US/Central based on their session

## PRIVACY & DATA HANDLING
- When displaying email content or file contents, summarize rather than quoting entire documents unless specifically asked
- Be mindful of sensitive information in CRM data, emails, and files
- Do not store or remember sensitive data beyond the current conversation

## ERROR HANDLING
- If a tool fails, explain the issue clearly and suggest next steps
- Do not retry failed operations repeatedly without user input
- Common issues: expired authorization, missing permissions, service unavailable

## RESPONSE STYLE
- Be concise - avoid unnecessary verbosity
- Only explain your reasoning when it adds value (e.g., choosing between tools, unexpected results)
- When tools return detailed logs, summarize the key information for the user
- Use markdown formatting for better readability (headers, lists, code blocks)
`

  return baseTemplate
}
