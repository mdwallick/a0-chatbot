import OpenAI from "openai"
import { z } from "zod"
import { tool } from "ai"
import { incrementImageUsage } from "@/lib/utils"

import type { ChatContext } from "@/lib/types"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const toolSchema = z.object({
  prompt: z.string().describe("A detailed description of the image to generate"),
})

export const DalleImageTool = (context: ChatContext) =>
  tool({
    description: "Generate an image using DALL·E based on a prompt.",
    parameters: toolSchema,
    execute: async ({ prompt }) => {
      const userId = context?.user?.id
      if (!userId) {
        return "Sorry, you must be signed in to generate images."
      }

      await incrementImageUsage(userId)

      const response = await openai.images.generate({
        model: "dall-e-2",
        prompt,
        n: 1,
        size: "512x512",
      })

      const url = response.data?.[0]?.url
      if (!url) throw new Error("Image generation failed")

      return `Here is your image: ${url}`
    },
  })
