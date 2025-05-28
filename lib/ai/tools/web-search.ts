import { tool } from "ai"
import { z } from "zod"

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY!
const GOOGLE_CX = process.env.GOOGLE_CX!

const toolSchema = z.object({
  query: z.string().describe("The search query to look up on Google"),
})

export const WebSearchTool = tool({
  description: "Performs a Google search",
  parameters: toolSchema,
  execute: googleSearch,
})

export async function googleSearch(args: any) {
  const query = args.query
  console.log("Searching Google for", query)

  const res = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}`
  )

  const data = await res.json()
  // console.log("Raw search results", data)

  if (!data.items || data.items.length === 0) {
    console.error("Error", data.error.status)
    console.error("Details", data.error.message)
    return { results: "No search results found." }
  }

  const markdown = data.items
    .slice(0, 3)
    .map((item: any, index: number) => {
      const title = item.title
      const link = item.link
      const snippet = item.snippet

      return `${index + 1}. [${title}](${link}) – ${snippet}`
    })
    .join("\n\n")

  console.log("Generating markdown", markdown)
  return {
    results: markdown,
  }
}
