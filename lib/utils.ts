import type { UIMessage, FileUIPart } from "ai"
import { ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { GoogleFile } from "@/components/google-picker"

import { startOfDay } from "date-fns"

/**
 * Extract text content from a UIMessage
 * In AI SDK v6, messages use parts array instead of content string
 */
export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map(part => part.text)
    .join("")
}

// Type for tool parts - using a flexible interface since AI SDK types are complex
interface ToolPartLike {
  type: string
  toolCallId?: string
  toolName?: string
  input?: unknown
  output?: unknown
  state?: string
}

/**
 * Check if a part is a tool invocation (has toolCallId)
 */
function isToolPart(part: { type: string }): part is ToolPartLike {
  // Tool parts have a type that starts with "tool-" or is "dynamic-tool"
  return (
    typeof part.type === "string" &&
    (part.type.startsWith("tool-") || part.type === "dynamic-tool") &&
    "toolCallId" in part
  )
}

/**
 * Flatten tool invocations in messages to plain text.
 * This enables compatibility with ZDR (Zero Data Retention) models that don't
 * persist tool call IDs between requests.
 *
 * Instead of sending tool call/result pairs with IDs, we convert them to
 * readable text summaries that the model can understand without ID tracking.
 */
export function flattenToolCalls(messages: UIMessage[]): UIMessage[] {
  return messages.map(message => {
    // Only process assistant messages (they contain tool calls)
    if (message.role !== "assistant") {
      return message
    }

    const textParts: string[] = []
    let hasToolParts = false

    for (const part of message.parts) {
      if (part.type === "text") {
        textParts.push((part as { text: string }).text)
      } else if (isToolPart(part as { type: string })) {
        hasToolParts = true
        const toolPart = part as ToolPartLike
        // Extract tool name from type (e.g., "tool-MicrosoftCalendarReadTool" -> "MicrosoftCalendarReadTool")
        const toolName =
          toolPart.toolName ||
          (toolPart.type.startsWith("tool-") ? toolPart.type.slice(5) : toolPart.type)

        // Format tool invocation as text
        const toolText = formatToolAsText(toolName, toolPart.input, toolPart.output, toolPart.state)
        textParts.push(toolText)
      }
      // Skip other part types (reasoning, sources, etc.) - they're not relevant for ZDR
    }

    // If no tool parts, return original message
    if (!hasToolParts) {
      return message
    }

    // Return message with flattened text content
    return {
      ...message,
      parts: [{ type: "text" as const, text: textParts.join("\n\n") }],
    }
  })
}

/**
 * Format a tool invocation as readable text for the model
 */
function formatToolAsText(
  toolName: string,
  input: unknown,
  output: unknown,
  state?: string
): string {
  const lines: string[] = []

  // Add tool call header
  lines.push(`[Tool: ${toolName}]`)

  // Add input if available (summarized)
  if (input && typeof input === "object") {
    const inputSummary = summarizeObject(input, 200)
    lines.push(`Input: ${inputSummary}`)
  }

  // Add output if available
  if (state === "output-available" || output !== undefined) {
    if (output && typeof output === "object") {
      const outputSummary = summarizeObject(output, 500)
      lines.push(`Result: ${outputSummary}`)
    } else if (typeof output === "string") {
      lines.push(`Result: ${output.slice(0, 500)}${output.length > 500 ? "..." : ""}`)
    }
  } else if (state === "error") {
    lines.push("Result: Tool execution failed")
  }

  return lines.join("\n")
}

/**
 * Summarize an object as a compact string representation
 */
function summarizeObject(obj: unknown, maxLength: number): string {
  try {
    const json = JSON.stringify(obj, null, 0)
    if (json.length <= maxLength) {
      return json
    }
    return json.slice(0, maxLength - 3) + "..."
  } catch {
    return "[complex object]"
  }
}
import { prisma } from "@/lib/prisma"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getImageCreationLimit() {
  const raw = parseInt(process.env.IMAGES_PER_DAY_LIMIT ?? "", 10)
  return raw > 0 ? raw : 3
}

export interface AttachmentWithMeta extends FileUIPart {
  metadata: GoogleFile
}

export function trimMessages(
  messages: UIMessage[],
  options: {
    keepSystem?: boolean
    maxMessages?: number
  } = {}
): UIMessage[] {
  const { keepSystem = true, maxMessages = 10 } = options

  const systemMessages = keepSystem ? messages.filter(m => m.role === "system") : []

  const chatMessages = messages.filter(m => m.role === "user" || m.role === "assistant")

  const trimmedMessages = chatMessages.slice(-maxMessages)

  return [...systemMessages, ...trimmedMessages]
}

export async function incrementImageUsage(userId: string) {
  const today = startOfDay(new Date()) // ensures only YYYY-MM-DD is used
  const maxPerDay = getImageCreationLimit()

  const usage = await prisma.dailyUsage.upsert({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
    update: {
      count: {
        increment: 1,
      },
    },
    create: {
      userId,
      date: today,
      count: 1,
    },
  })

  if (usage.count > maxPerDay) {
    throw new Error(`You've reached your daily limit of ${maxPerDay} image generations.`)
  }
}

export async function getImageCountToday(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const usage = await prisma.dailyUsage.findFirst({
    where: {
      userId,
      date: { gte: today },
    },
  })
  return usage?.count
}
