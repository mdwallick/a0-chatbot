import { createUIMessageStream, createUIMessageStreamResponse, UIMessage } from "ai"

import {
  DalleImageTool,
  GNewsSearchTool,
  WebSearchTool,
  ProductSearchTool,
  CheckoutTool,
} from "@/lib/ai/tools"
import {
  GmailReadTool,
  GmailSendTool,
  GoogleDriveTool,
  GoogleCalendarReadTool,
  GoogleCalendarWriteTool,
  GoogleFilesWriteTool,
  GoogleFolderCreateTool,
} from "@/lib/ai/tools/google"

import {
  MicrosoftCalendarReadTool,
  MicrosoftCalendarWriteTool,
  MicrosoftOneDriveTool,
  MicrosoftFilesWriteTool,
  MicrosoftMailReadTool,
  MicrosoftMailSendTool,
} from "@/lib/ai/tools/microsoft"
import { XboxUserProfileTool, XboxAchievementTool } from "@/lib/ai/tools/xbox"
import { SalesforceTool } from "@/lib/ai/tools/salesforce"

import { auth0 } from "@/lib/auth0"
import { isProviderEnabled, getEnabledProviders } from "@/lib/config/enabled-connections"
import { setAIContext } from "@auth0/ai-vercel"

import { trimMessages, getMessageText, flattenToolCalls } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { summarizeThread } from "@/lib/summarize-thread"
import { getImageCountToday, getImageCreationLimit } from "@/lib/utils"
import {
  convertToolsToOpenAI,
  convertMessagesToOpenAI,
  streamChatWithTools,
} from "@/lib/openai-chat"

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

  // Base tools available to all users
  const toolDefinitions: Record<string, any> = {
    DalleImageTool,
    GNewsSearchTool,
    WebSearchTool,
    ProductSearchTool,
    CheckoutTool,
  }

  // Conditionally add provider-specific tools based on ENABLED_CONNECTIONS
  if (isProviderEnabled("google")) {
    Object.assign(toolDefinitions, {
      GmailReadTool,
      GmailSendTool,
      GoogleDriveTool,
      GoogleCalendarReadTool,
      GoogleCalendarWriteTool,
      GoogleFilesWriteTool,
      GoogleFolderCreateTool,
    })
  }

  if (isProviderEnabled("microsoft")) {
    Object.assign(toolDefinitions, {
      MicrosoftCalendarReadTool,
      MicrosoftCalendarWriteTool,
      MicrosoftOneDriveTool,
      MicrosoftFilesWriteTool,
      MicrosoftMailReadTool,
      MicrosoftMailSendTool,
    })
  }

  if (isProviderEnabled("salesforce")) {
    Object.assign(toolDefinitions, {
      SalesforceTool,
    })
  }

  if (isProviderEnabled("xbox")) {
    Object.assign(toolDefinitions, {
      XboxUserProfileTool,
      XboxAchievementTool,
    })
  }

  // Instantiate tools with context
  const tools = Object.fromEntries(
    Object.entries(toolDefinitions).map(([name, definition]) => {
      if (typeof definition === "function") {
        return [name, definition(context)]
      }
      return [name, definition]
    })
  )

  // Convert tools to OpenAI function format
  const openaiTools = convertToolsToOpenAI(tools)

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
        parts: lastMessage.parts as any,
        threadId: id,
      },
    })
  }

  const trimmedMessages = trimMessages(messages, {
    keepSystem: true,
    maxMessages: 12,
  })

  // Flatten tool calls in conversation history for ZDR compatibility
  const flattenedMessages = flattenToolCalls(trimmedMessages)

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
  const systemPrompt = `The current date and time is ${now}. ${systemTemplate}`

  // Convert messages to OpenAI format
  const openaiMessages = convertMessagesToOpenAI(flattenedMessages as any, systemPrompt)

  // Use Vercel AI SDK's UI message stream for proper client format
  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      let fullText = ""
      let textId = `text-${Date.now()}`

      try {
        const generator = streamChatWithTools({
          model: process.env.OPENAI_MODEL || "claude-4-5-sonnet",
          messages: openaiMessages,
          tools,
          openaiTools,
          maxIterations: 5,
          onToolCall: (toolName, toolArgs) => {
            console.log(`[Chat] Tool called: ${toolName}`, toolArgs)
          },
          onToolResult: toolName => {
            console.log(`[Chat] Tool result: ${toolName}`)
          },
          onToolError: (toolName, error) => {
            console.log(`[Chat] Tool error: ${toolName}`, error.message)
          },
        })

        let textStarted = false
        // Track active tool call IDs to match tool_call with tool_result
        const activeToolCallIds: Map<string, string> = new Map()

        for await (const event of generator) {
          if (event.type === "text") {
            if (!textStarted) {
              // Start text part
              writer.write({ type: "text-start", id: textId })
              textStarted = true
            }
            // Stream text delta
            writer.write({ type: "text-delta", id: textId, delta: event.text })
            fullText += event.text
          } else if (event.type === "tool_call") {
            // If we were writing text, end it first
            if (textStarted) {
              writer.write({ type: "text-end", id: textId })
              textStarted = false
              textId = `text-${Date.now()}` // New ID for next text block
            }
            // Generate consistent tool call ID for this tool invocation
            const toolCallId = `${event.toolName}-${Date.now()}`
            activeToolCallIds.set(event.toolName, toolCallId)
            // Write tool input
            writer.write({
              type: "tool-input-start",
              toolCallId,
              toolName: event.toolName,
            })
            writer.write({
              type: "tool-input-available",
              toolCallId,
              toolName: event.toolName,
              input: event.toolArgs,
            })
          } else if (event.type === "tool_result") {
            // Use the tracked toolCallId from the corresponding tool_call
            const toolCallId =
              activeToolCallIds.get(event.toolName) || `${event.toolName}-${Date.now()}`
            writer.write({
              type: "tool-output-available",
              toolCallId,
              output: event.result,
            })
          } else if (event.type === "done") {
            // End any open text
            if (textStarted) {
              writer.write({ type: "text-end", id: textId })
            }
            fullText = event.fullText
          } else if (event.type === "error") {
            // Handle errors
            if (textStarted) {
              writer.write({ type: "text-end", id: textId })
            }
            throw event.error
          }
        }

        // Save assistant response to database
        if (isAuthenticated && fullText) {
          await prisma.message.create({
            data: {
              role: "assistant",
              content: fullText,
              parts: [{ type: "text", text: fullText }] as any,
              threadId: id,
            },
          })

          // Auto-summarize after first complete exchange
          const thread = await prisma.chatThread.findUnique({
            where: { id },
            include: {
              messages: {
                orderBy: { createdAt: "asc" },
                take: 4,
              },
            },
          })

          if (thread && thread.summary === "New conversation" && thread.messages.length >= 2) {
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
      } catch (error: any) {
        console.error("[Chat] Error:", error)
        // Re-throw so the stream handles it
        throw error
      }
    },
    onError: err => {
      console.error("[Chat] Stream error:", err)
      return "An error occurred while processing your request."
    },
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
  const enabledProviders = getEnabledProviders()

  // Build dynamic integrations list based on enabled providers
  const integrationDescriptions: Record<string, string> = {
    google:
      "- **Google**: Read/send/draft Gmail, read/write Calendar events, search/read Drive files (single tool), write files, create folders",
    microsoft:
      "- **Microsoft**: Read/send Outlook mail, read/write Calendar events, browse/read OneDrive files (single tool), write files",
    salesforce:
      "- **Salesforce**: Search and query CRM records (single tool with action parameter)",
    xbox: "- **Xbox**: Read player profile, gamerscore, and achievement history",
  }

  const enabledIntegrations = enabledProviders
    .map(provider => integrationDescriptions[provider])
    .filter(Boolean)
    .join("\n")

  const disabledProviders = (["google", "microsoft", "salesforce", "xbox"] as const).filter(
    p => !enabledProviders.includes(p)
  )

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
${enabledIntegrations}
- **Commerce**: Search products and create checkout sessions
- **News Search**: Get current headlines and news articles by topic (business, technology, sports, etc.)
- **Web Search**: Search the internet for general information
- **Image Generation**: Create images with DALL-E (limit: ${maxPerDay}/day)
${typeof imageUsageCount === "number" ? `  - Images generated today: ${imageUsageCount}/${maxPerDay}` : ""}
`
    : `
- **News Search**: Get current headlines and news articles
- **Web Search**: Search the internet for general information
- **Commerce**: Search products and create checkout sessions
- **Image Generation**: Requires sign-in
${disabledProviders.length === 4 ? "- **Google/Microsoft/Salesforce/Xbox**: Requires sign-in" : enabledProviders.length > 0 ? `- **${enabledProviders.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("/")}**: Requires sign-in` : ""}
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
