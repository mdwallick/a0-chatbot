import { createDataStreamResponse, Message, streamText, Tool } from "ai"

import { DalleImageTool, WebSearchTool, ProductSearchTool, CheckoutTool } from "@/lib/ai/tools"

import { auth0 } from "@/lib/auth0"
import { openai } from "@ai-sdk/openai"
import { setAIContext } from "@auth0/ai-vercel"
import { errorSerializer, withInterruptions } from "@auth0/ai-vercel/interrupts"

import { trimMessages } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { summarizeThread } from "@/lib/summarize-thread"
import { getImageCountToday, getImageCreationLimit } from "@/lib/utils"

export async function POST(request: Request) {
  try {
    const { id, messages }: { id: string; messages: Array<Message>; selectedChatModel: string } =
      await request.json()

    console.log("[CHAT API] Request received:", { id, messageCount: messages.length })

    setAIContext({ threadID: id })

    const session = await auth0.getSession()
    console.log("[CHAT API] Session:", session ? "authenticated" : "unauthenticated")
    const isAuthenticated = !!session?.user

    const context = {
      user: session?.user
        ? {
            // Only populate user data if a session exists
            id: session.user.sub,
            email: session.user.email,
            name: session.user.name,
          }
        : undefined,
    }

    // Temporarily disable integration tools to test commerce functionality
    // TODO: Fix googleapis/google-auth-library bundling issues
    const toolDefinitions = {
      DalleImageTool,
      WebSearchTool,
      ProductSearchTool,
      CheckoutTool,
    }

    // const tools = {
    //   DalleImageTool,
    //   WebSearchTool,
    //   GmailReadTool,
    //   GmailSendTool,
    //   GoogleFilesListTool,
    //   GoogleCalendarReadTool,
    //   GoogleCalendarWriteTool,
    //   GoogleFilesReadTool,
    //   GoogleFilesWriteTool,
    //   MicrosoftCalendarReadTool,
    //   MicrosoftCalendarWriteTool,
    //   MicrosoftFilesListTool,
    //   MicrosoftFilesReadTool,
    //   MicrosoftFilesWriteTool,
    //   MicrosoftMailReadTool,
    //   MicrosoftMailSendTool,
    //   SalesforceQueryTool,
    //   SalesforceSearchTool,
    //   XboxUserProfileTool,
    //   XboxAchievementTool,
    // }
    const tools: Record<string, Tool<any, any>> = Object.fromEntries(
      Object.entries(toolDefinitions).map(([name, definition]) => {
        // Check if the definition is a function (needs context) or just a static object
        if (typeof definition === "function") {
          return [name, definition(context)] // Call it with context to get the tool
        }
        return [name, definition] // It's a static tool, pass it through
      })
    )

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

    let imageUsageCount: number | undefined = undefined

    if (isAuthenticated && context.user?.id) {
      imageUsageCount = await getImageCountToday(context.user.id)
    }

    const systemTemplate = await getSystemTemplate({
      userName: context.user?.name?.split(" ")[0],
      imageUsageCount,
    })
    const now = new Date().toLocaleString("en-US", { timeZone: "US/Central" })

    const config = {
      messages: trimmedMessages,
      tools,
      context,
    } as const

    return createDataStreamResponse({
      execute: withInterruptions(async dataStream => {
        const result = streamText({
          model: openai(process.env.OPENAI_MODEL || "gpt-4o"),
          system: `The current date and time is ${now}. ${systemTemplate}`,
          messages: trimmedMessages,
          maxSteps: 5,
          tools,
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
      }, config),
      onError: errorSerializer(err => {
        console.error("[CHAT API] Stream error:", err)
        return "Oops, an error occured!"
      }),
    })
  } catch (error) {
    console.error("[CHAT API] Fatal error:", error)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

async function getSystemTemplate({
  userName,
  imageUsageCount,
}: {
  userName?: string
  imageUsageCount?: number
}) {
  const maxPerDay = getImageCreationLimit()

  const baseTemplate = `
You are a friendly assistant! Keep your responses concise and helpful.

You're currently helping ${userName ?? "a user"}.

The maximum number of images a user can generate in a day is ${maxPerDay}.

${
  typeof imageUsageCount === "number"
    ? `They have generated ${imageUsageCount} image${imageUsageCount !== 1 ? "s" : ""} today.`
    : ""
}

Available integrations:
- Google: Gmail, Google Calendar, and Google Drive files and folders
- Microsoft: Outlook email, calendar and OneDrive files and folders
- Salesforce: Search CRM records e.g. accounts, contacts, opportunities
- Xbox: read player profile and achievements

TOOL SELECTION RULES:
1. Use the 'WebSearchTool' tool to get up-to-date web information. When presenting results to the user, format them in numbered Markdown list with clickable links and brief summaries. Include images whenever possible.
2. Use the 'ProductSearchTool' to search the UCP commerce catalog. When presenting products, ALWAYS format each product as:
   - Title with price as a clickable link: [Product Title - $Price](link)
   - Product image using markdown: ![Product Title](image_link)
   - Description text
   - Product ID for checkout reference
3. Use the 'CheckoutTool' to create checkout sessions. After creating a checkout:
   - If an identityLinkingUrl is returned, present it to the user as a clickable link: [Link your account to complete checkout](identityLinkingUrl)
   - Explain that linking their account enables order tracking, saved payment methods, and personalized features
   - If no identityLinkingUrl is returned and user is not signed in, inform them they need to sign in first to link their merchant account
   - Show the checkout session ID for reference
4. Only use tools that are directly relevant to the user's request.
5. Do not use calendar tools unless explicitly asked about calendar/schedule/meetings
6. Do not mix tools from different services unless specifically requested

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
