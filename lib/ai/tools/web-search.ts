import { tool } from "ai"
import { z } from "zod"

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY!
const GOOGLE_CX = process.env.GOOGLE_CX!

const toolSchema = z.object({
  query: z.string().describe("The search query to look up on Google"),
  searchType: z
    .enum(["web", "images"])
    .optional()
    .default("web")
    .describe("Type of search: web for regular results, images for image results"),
})

export const WebSearchTool = tool({
  description: "Performs a Google search (web or image search)",
  inputSchema: toolSchema,
  execute: googleSearch,
})

export async function googleSearch(args: any) {
  const { query, searchType = "web" } = args

  const searchParams = new URLSearchParams({
    key: GOOGLE_SEARCH_API_KEY,
    cx: GOOGLE_CX,
    q: query,
  })

  if (searchType === "images") {
    searchParams.append("searchType", "image")
  }

  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${searchParams}`)

  const data = await res.json()

  if (!data.items || data.items.length === 0) {
    if (data.error) {
      console.error("Error", data.error.status)
      console.error("Details", data.error.message)
    }
    return { results: "No search results found." }
  }

  if (searchType === "images") {
    const markdown = data.items
      .slice(0, 3)
      .map((item: any, index: number) => {
        const title = item.title
        const link = item.link
        const snippet = item.snippet
        const image = item.image

        return `${index + 1}. **${title}**\n![${title}](${link})\n[View source](${image?.contextLink || link}) | ${snippet}`
      })
      .join("\n\n")

    return {
      results: markdown,
    }
  } else {
    const markdown = data.items
      .slice(0, 3)
      .map((item: any, index: number) => {
        const title = item.title
        const link = item.link
        const snippet = item.snippet

        return `${index + 1}. [${title}](${link}) – ${snippet}`
      })
      .join("\n\n")

    return {
      results: markdown,
    }
  }
}
