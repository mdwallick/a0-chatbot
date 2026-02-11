import { tool } from "ai"
import { z } from "zod"

const SERPAPI_KEY = process.env.SERP_API_KEY!

const toolSchema = z.object({
  query: z.string().describe("The search query to look up"),
  location: z.string().optional().describe("Location for localized search results"),
  num: z.number().optional().default(3).describe("Number of results to return (1-10)"),
  searchType: z
    .enum(["web", "images"])
    .optional()
    .default("web")
    .describe("Type of search: web for regular results, images for image results"),
})

export const SerpAPISearchTool = tool({
  description: "Performs a web search using SerpAPI (Google Search)",
  inputSchema: toolSchema,
  execute: serpAPISearch,
})

export async function serpAPISearch(args: any) {
  const { query, location = "United States", num = 3, searchType = "web" } = args

  const params = new URLSearchParams({
    engine: searchType === "images" ? "google_images" : "google",
    q: query,
    api_key: SERPAPI_KEY,
    location: location,
    num: num.toString(),
  })

  try {
    const res = await fetch(`https://serpapi.com/search?${params}`)
    const data = await res.json()

    if (data.error) {
      console.error("Invalid Serp API key!")
      return { results: "Something is wrong with the search service." }
    }

    if (searchType === "images") {
      if (!data.images_results || data.images_results.length === 0) {
        return { results: "No image results found." }
      }

      const markdown = data.images_results
        .slice(0, num)
        .map((item: any, index: number) => {
          const title = item.title || "Image"
          const thumbnail = item.thumbnail
          const original = item.original
          const source = item.source

          return `${index + 1}. **${title}**\n![${title}](${thumbnail})\n[View full size](${original}) | Source: ${source}`
        })
        .join("\n\n")

      return { results: markdown }
    } else {
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

      return { results: markdown }
    }
  } catch (error) {
    console.error("SerpAPI error:", error)
    return { results: "Error occurred while searching." }
  }
}
