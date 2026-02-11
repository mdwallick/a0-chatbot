import { tool } from "ai"
import { z } from "zod"

const PRODUCT_FEED_URL = "https://product-feed-f2f9b7df68ba.herokuapp.com/api/ucp/products"
const TOKEN_URL = "https://agentic-commerce-merchant.cic-demo-platform.auth0app.com/oauth/token"
const CHECKOUT_URL =
  "https://3ufw32ejnj76pybzbj6ovbzlvm0zzkur.lambda-url.us-east-1.on.aws/checkout-sessions"

// Schema for product search
const productSearchSchema = z.object({
  query: z.string().describe("The search query to find products (e.g., 'pony', 'shoes', 'laptop')"),
  limit: z.number().optional().default(5).describe("Maximum number of products to return (1-10)"),
})

// Schema for checkout
const checkoutSchema = z.object({
  lineItems: z
    .array(
      z.object({
        productId: z.string().describe("The product ID"),
        productTitle: z.string().describe("The product title/name"),
        quantity: z.number().describe("Quantity to purchase"),
      })
    )
    .describe("Array of items to checkout"),
  currency: z.string().optional().default("USD").describe("Currency code (e.g., USD, EUR)"),
})

// Get OAuth token for commerce API using merchant credentials
async function getCommerceToken(): Promise<string> {
  const merchantDomain = process.env.MERCHANT_DOMAIN
  const merchantClientId = process.env.MERCHANT_CLIENT_ID
  const merchantClientSecret = process.env.MERCHANT_CLIENT_SECRET
  const merchantAudience = process.env.MERCHANT_AUDIENCE
  const merchantScope = process.env.MERCHANT_SCOPE

  if (!merchantDomain || !merchantClientId || !merchantClientSecret) {
    throw new Error(
      "Merchant credentials not configured (MERCHANT_DOMAIN, MERCHANT_CLIENT_ID, MERCHANT_CLIENT_SECRET)"
    )
  }

  const tokenUrl = `https://${merchantDomain}/oauth/token`

  console.log("[Token] Requesting token from:", tokenUrl)
  console.log("[Token] Client ID:", merchantClientId)
  console.log("[Token] Audience:", merchantAudience)

  try {
    const requestBody: any = {
      client_id: merchantClientId,
      client_secret: merchantClientSecret,
      grant_type: "client_credentials",
    }

    if (merchantAudience) {
      requestBody.audience = merchantAudience
    }

    // Don't send scope - the API grants the correct scopes automatically
    // based on the audience and the client's configured permissions

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token request failed: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error("Error getting commerce token:", error)
    throw error
  }
}

// Search products
async function searchProducts(args: any) {
  const { query, limit = 5 } = args

  try {
    const response = await fetch(PRODUCT_FEED_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error(`Product feed API error: ${response.status} ${response.statusText}`)
      return {
        error: `Failed to fetch products: ${response.status} ${response.statusText}`,
        products: [],
      }
    }

    // Check if response is JSON
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      console.error("Product feed API returned non-JSON response:", contentType)
      return {
        error: "Product feed service is currently unavailable (returned non-JSON response)",
        products: [],
      }
    }

    const data = await response.json()

    // Filter products based on query
    const allProducts = data.products || []
    const filteredProducts = allProducts.filter((product: any) => {
      const searchStr = `${product.title} ${product.description || ""}`.toLowerCase()
      return searchStr.includes(query.toLowerCase())
    })

    const limitedProducts = filteredProducts.slice(0, limit)

    if (limitedProducts.length === 0) {
      return {
        message: `No products found matching "${query}"`,
        products: [],
      }
    }

    // Return structured data for AI to format
    // Convert HTTP URLs to HTTPS to avoid mixed content issues
    return {
      success: true,
      count: limitedProducts.length,
      query: query,
      products: limitedProducts.map((product: any) => ({
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price?.value || null,
        currency: product.price?.currency || "USD",
        image_link: product.image_link?.replace(/^http:/, "https:") || null,
        link: product.link?.replace(/^http:/, "https:") || null,
        availability: product.availability,
        brand: product.brand,
      })),
    }
  } catch (error) {
    console.error("Product search error:", error)
    return {
      error: "Error occurred while searching for products",
      products: [],
    }
  }
}

// Create checkout session
async function createCheckout(args: any) {
  const { lineItems, currency = "USD" } = args

  try {
    // Get access token
    console.log("[Checkout] Getting merchant token...")
    const token = await getCommerceToken()
    console.log("[Checkout] Token received:", token ? `${token.substring(0, 20)}...` : "NO TOKEN")

    // Format line items for checkout API
    const formattedLineItems = lineItems.map((item: any) => ({
      item: {
        id: item.productId,
        title: item.productTitle,
      },
      quantity: item.quantity,
    }))

    console.log("[Checkout] Sending checkout request to:", CHECKOUT_URL)
    console.log("[Checkout] Line items:", JSON.stringify(formattedLineItems, null, 2))

    const response = await fetch(CHECKOUT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        line_items: formattedLineItems,
        currency: currency,
      }),
    })

    console.log("[Checkout] Response status:", response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Checkout] Error response:", errorText)
      return {
        error: `Checkout failed: ${response.statusText}`,
        details: errorText,
      }
    }

    const data = await response.json()

    return {
      success: true,
      message: "Checkout session created successfully!",
      checkoutUrl: data.url || data.checkout_url,
      sessionId: data.id || data.session_id,
      ...data,
    }
  } catch (error) {
    console.error("Checkout error:", error)
    return {
      error: "Error occurred while creating checkout session",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

// Export tools
export const ProductSearchTool = tool({
  description:
    "Search for products in the commerce catalog using UCP protocol. Returns product details including images, prices, and descriptions.",
  inputSchema: productSearchSchema,
  execute: searchProducts,
})

export const CheckoutTool = tool({
  description:
    "Create a checkout session for purchasing products. Requires product IDs and quantities from a previous product search.",
  inputSchema: checkoutSchema,
  execute: createCheckout,
})
