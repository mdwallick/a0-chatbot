import OpenAI from "openai"
import { z } from "zod"
import { tool } from "ai"
import { incrementImageUsage } from "@/lib/utils"

import type { ChatContext } from "@/lib/types"

/**
 * OpenAI client for DALL-E image generation
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const toolSchema = z.object({
  prompt: z.string().describe("A detailed description of the image to generate"),
})

export const DalleImageTool = (context: ChatContext) =>
  tool({
    description: "Generate an image using DALL·E based on a prompt.",
    inputSchema: toolSchema,
    execute: async ({ prompt }) => {
      const userId = context?.user?.id
      if (!userId) {
        return "Sorry, you must be signed in to generate images."
      }

      await incrementImageUsage(userId)

      const response = await openai.images.generate({
        model: process.env.DALL_E_MODEL || "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
      })

      const url = response.data?.[0]?.url
      if (!url) throw new Error("Image generation failed")

      return `Here is your image: ${url}`
    },
  })
