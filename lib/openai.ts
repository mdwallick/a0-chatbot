import { createOpenAI } from "@ai-sdk/openai"

/**
 * OpenAI provider instance for Vercel AI SDK
 * Uses OpenAI's API directly
 */
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
