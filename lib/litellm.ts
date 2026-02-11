import { createOpenAI } from "@ai-sdk/openai"

/**
 * liteLLM provider instance for Vercel AI SDK
 *
 * This configures the OpenAI-compatible provider to use liteLLM's proxy
 * instead of directly calling OpenAI's API. liteLLM acts as a unified
 * interface to multiple LLM providers.
 *
 * @see https://docs.litellm.ai/docs/
 */
export const litellm = createOpenAI({
  apiKey: process.env.LITELLM_API_KEY,
  baseURL: process.env.LITELLM_BASE_URL,
  name: "litellm",
})
