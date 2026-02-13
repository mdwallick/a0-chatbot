import { tool } from "ai"
import { z } from "zod"

const GNEWS_API_KEY = process.env.GNEWS_API_KEY

const toolSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("Search query for news articles. Leave empty for top headlines."),
  category: z
    .enum([
      "general",
      "world",
      "nation",
      "business",
      "technology",
      "entertainment",
      "sports",
      "science",
      "health",
    ])
    .optional()
    .default("general")
    .describe("News category to filter by"),
  maxResults: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(5)
    .describe("Number of results to return (1-10)"),
})

export const GNewsSearchTool = tool({
  description:
    "Search for current news articles and headlines. Use this for news, headlines, current events, and recent happenings. Supports filtering by category (business, technology, sports, etc.).",
  inputSchema: toolSchema,
  execute: gnewsSearch,
})

export async function gnewsSearch(args: z.infer<typeof toolSchema>) {
  if (!GNEWS_API_KEY) {
    return {
      error: "News search is not configured. GNEWS_API_KEY is missing.",
    }
  }

  const { query, category = "general", maxResults = 5 } = args

  try {
    // Use search endpoint if query provided, otherwise top-headlines
    const endpoint = query ? "search" : "top-headlines"

    const params = new URLSearchParams({
      token: GNEWS_API_KEY,
      lang: "en",
      country: "us",
      max: maxResults.toString(),
    })

    if (query) {
      params.append("q", query)
    }

    if (category && category !== "general") {
      params.append("topic", category)
    }

    const url = `https://gnews.io/api/v4/${endpoint}?${params}`
    const res = await fetch(url)

    if (!res.ok) {
      const errorText = await res.text()
      console.error("[GNews] API error:", res.status, errorText)
      return {
        error: `News search failed: ${res.status}`,
      }
    }

    const data = await res.json()

    if (!data.articles || data.articles.length === 0) {
      return {
        results: "No news articles found for this query.",
      }
    }

    // Format results as markdown
    const markdown = data.articles
      .map((article: any, index: number) => {
        const title = article.title
        const description = article.description || ""
        const url = article.url
        const source = article.source?.name || "Unknown source"
        const publishedAt = article.publishedAt
          ? new Date(article.publishedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : ""

        return `${index + 1}. **${title}**\n   ${description}\n   [Read more](${url}) | ${source}${publishedAt ? ` | ${publishedAt}` : ""}`
      })
      .join("\n\n")

    return {
      results: markdown,
      articleCount: data.articles.length,
      totalResults: data.totalArticles || data.articles.length,
    }
  } catch (error) {
    console.error("[GNews] Error:", error)
    return {
      error: "Failed to fetch news. Please try again.",
    }
  }
}
