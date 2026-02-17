import OpenAI from "openai"
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions"
import { zodToJsonSchema } from "zod-to-json-schema"
import type { ZodSchema } from "zod"

/**
 * OpenAI client configured to use liteLLM proxy.
 * Uses the standard chat completions API (/v1/chat/completions) which is
 * compatible with ZDR (Zero Data Retention) - unlike OpenAI's responses API.
 */
export const openaiClient = new OpenAI({
  apiKey: process.env.LITELLM_API_KEY,
  baseURL: process.env.LITELLM_BASE_URL,
})

/**
 * Vercel AI SDK tool structure
 */
interface VercelTool {
  description: string
  inputSchema: ZodSchema
  execute: (args: unknown, context?: { toolCallId: string }) => Promise<unknown>
}

/**
 * Convert Vercel AI SDK tools to OpenAI function format
 */
export function convertToolsToOpenAI(tools: Record<string, VercelTool>): ChatCompletionTool[] {
  return Object.entries(tools).map(([name, tool]) => {
    // Convert Zod schema to JSON Schema
    const jsonSchema = zodToJsonSchema(tool.inputSchema, {
      $refStrategy: "none",
      target: "openAi",
    })

    // Remove the outer wrapper that zod-to-json-schema adds
    const parameters = jsonSchema as Record<string, unknown>
    delete parameters.$schema

    return {
      type: "function" as const,
      function: {
        name,
        description: tool.description,
        parameters: parameters as Record<string, unknown>,
      },
    }
  })
}

/**
 * Convert UI messages to OpenAI message format
 */
export function convertMessagesToOpenAI(
  messages: Array<{ role: string; parts?: Array<{ type: string; text?: string }> }>,
  systemPrompt: string
): ChatCompletionMessageParam[] {
  const openaiMessages: ChatCompletionMessageParam[] = [{ role: "system", content: systemPrompt }]

  for (const msg of messages) {
    if (msg.role === "system") continue // Skip system messages, we add our own

    // Extract text content from parts
    const textContent =
      msg.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text" && !!p.text)
        .map(p => p.text)
        .join("") || ""

    if (msg.role === "user") {
      openaiMessages.push({ role: "user", content: textContent })
    } else if (msg.role === "assistant") {
      openaiMessages.push({ role: "assistant", content: textContent })
    }
  }

  return openaiMessages
}

/**
 * Execute a tool and return the result.
 * We pass a context object with toolCallId as the second argument,
 * which is required by Auth0 AI SDK's tool wrappers.
 */
export async function executeTool(
  tools: Record<string, VercelTool>,
  toolName: string,
  toolArgs: unknown,
  toolCallId: string
): Promise<{ success: boolean; result?: unknown; error?: Error }> {
  const tool = tools[toolName]
  if (!tool) {
    return {
      success: false,
      error: new Error(`Unknown tool: ${toolName}`),
    }
  }

  try {
    // Vercel AI SDK tools expect (args, context) where context contains toolCallId
    // The Auth0 AI SDK's withTokenVault wrapper uses this context
    const context = { toolCallId }
    const result = await tool.execute(toolArgs, context)
    return { success: true, result }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}

/**
 * Stream chat completion with tool execution loop.
 * This implements the agentic loop: call model -> execute tools -> call model again
 * until the model returns a final text response.
 */
export async function* streamChatWithTools(options: {
  model: string
  messages: ChatCompletionMessageParam[]
  tools: Record<string, VercelTool>
  openaiTools: ChatCompletionTool[]
  maxIterations?: number
  onToolCall?: (toolName: string, toolArgs: unknown) => void
  onToolResult?: (toolName: string, result: unknown) => void
  onToolError?: (toolName: string, error: Error) => void
}): AsyncGenerator<
  | { type: "text"; text: string }
  | { type: "tool_call"; toolName: string; toolArgs: unknown }
  | { type: "tool_result"; toolName: string; result: unknown }
  | { type: "error"; error: Error }
  | { type: "done"; fullText: string }
> {
  const {
    model,
    messages,
    tools,
    openaiTools,
    maxIterations = 5,
    onToolCall,
    onToolResult,
    onToolError,
  } = options

  const conversationMessages = [...messages]
  let fullText = ""
  let iterations = 0

  while (iterations < maxIterations) {
    iterations++

    // Make streaming chat completion request
    const stream = await openaiClient.chat.completions.create({
      model,
      messages: conversationMessages,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      stream: true,
    })

    let currentContent = ""
    const toolCalls: Array<{
      id: string
      name: string
      arguments: string
    }> = []
    let currentToolCall: { id: string; name: string; arguments: string } | null = null

    // Process the stream
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta

      // Handle text content
      if (delta?.content) {
        currentContent += delta.content
        fullText += delta.content
        yield { type: "text", text: delta.content }
      }

      // Handle tool calls
      if (delta?.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          if (toolCallDelta.index !== undefined) {
            // Start of a new tool call or continuation
            if (toolCallDelta.id) {
              // New tool call
              currentToolCall = {
                id: toolCallDelta.id,
                name: toolCallDelta.function?.name || "",
                arguments: toolCallDelta.function?.arguments || "",
              }
              toolCalls[toolCallDelta.index] = currentToolCall
            } else if (toolCalls[toolCallDelta.index]) {
              // Continuation of existing tool call
              if (toolCallDelta.function?.name) {
                toolCalls[toolCallDelta.index].name += toolCallDelta.function.name
              }
              if (toolCallDelta.function?.arguments) {
                toolCalls[toolCallDelta.index].arguments += toolCallDelta.function.arguments
              }
            }
          }
        }
      }
    }

    // If no tool calls, we're done
    if (toolCalls.length === 0) {
      yield { type: "done", fullText }
      return
    }

    // Add assistant message with tool calls to conversation
    conversationMessages.push({
      role: "assistant",
      content: currentContent || null,
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.name,
          arguments: tc.arguments,
        },
      })),
    })

    // Execute each tool call
    for (const toolCall of toolCalls) {
      let toolArgs: unknown
      try {
        toolArgs = JSON.parse(toolCall.arguments)
      } catch {
        toolArgs = {}
      }

      yield { type: "tool_call", toolName: toolCall.name, toolArgs }
      onToolCall?.(toolCall.name, toolArgs)

      const { success, result, error } = await executeTool(
        tools,
        toolCall.name,
        toolArgs,
        toolCall.id
      )

      if (success) {
        yield { type: "tool_result", toolName: toolCall.name, result }
        onToolResult?.(toolCall.name, result)

        // Add tool result to conversation
        conversationMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: typeof result === "string" ? result : JSON.stringify(result),
        })
      } else {
        yield { type: "error", error: error! }
        onToolError?.(toolCall.name, error!)

        // Re-throw the error so it can be caught by withInterruptions
        // This is important for Auth0 consent flow handling
        throw error
      }
    }

    // Continue loop to get model's response to tool results
  }

  // Max iterations reached
  yield { type: "done", fullText }
}
