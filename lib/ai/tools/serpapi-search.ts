import { tool } from "ai"
import { z } from "zod"

const SERPAPI_KEY = process.env.SERPAPI_API_KEY!

const toolSchema = z.object({
  query: z.string().describe("The search query to look up"),
  location: z.string().optional().describe("Location for localized search results"),
  num: z.number().optional().default(3).describe("Number of results to return (1-10)"),
})

export const SerpAPISearchTool = tool({
  description: "Performs a web search using SerpAPI (Google Search)",
  parameters: toolSchema,
  execute: serpAPISearch,
})

export async function serpAPISearch(args: any) {
  const { query, location = "United States", num = 3 } = args
  console.log("Searching with SerpAPI for", query)

  const params = new URLSearchParams({
    engine: "google",
    q: query,
    api_key: SERPAPI_KEY,
    location: location,
    num: num.toString(),
  })

  try {
    const res = await fetch(`https://serpapi.com/search?${params}`)
    const data = await res.json()

    if (!data.organic_results || data.organic_results.length === 0) {
      return { results: "No search results found." }
    }

    const markdown = data.organic_results
      .slice(0, num)
      .map((item: any, index: number) => {
        const title = item.title
        const link = item.link
        const snippet = item.snippet

        return `${index + 1}. [${title}](${link}) – ${snippet}`
      })
      .join("\n\n")

    console.log("SerpAPI results generated")
    return { results: markdown }
  } catch (error) {
    console.error("SerpAPI error:", error)
    return { results: "Error occurred while searching." }
  }
}
