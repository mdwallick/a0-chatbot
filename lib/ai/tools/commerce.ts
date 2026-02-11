import { tool } from "ai"
import { z } from "zod"

const PRODUCT_FEED_URL = "https://product-feed-f2f9b7df68ba.herokuapp.com/api/ucp/products"
const TOKEN_URL = "https://agentic-commerce-merchant.cic-demo-platform.auth0app.com/oauth/token"
const CHECKOUT_URL =
  "https://3ufw32ejnj76pybzbj6ovbzlvm0zzkur.lambda-url.us-east-1.on.aws/checkout-sessions"

// Helper function to generate identity linking authorization URL
// Only generates URL if user is authenticated
function generateIdentityLinkingUrl(sessionId: string, userId?: string): string | null {
  // Require user authentication
  if (!userId) {
    console.log("[Identity Linking] User not authenticated, skipping identity linking")
    return null
  }

  const idlinkClientId = process.env.MERCHANT_IDLINK_CLIENT_ID
  const idlinkDomain = process.env.MERCHANT_IDLINK_DOMAIN
  const appBaseUrl = process.env.APP_BASE_URL || process.env.AUTH0_BASE_URL

  if (!idlinkClientId || !idlinkDomain || !appBaseUrl) {
    console.warn("[Identity Linking] Missing configuration, skipping identity linking")
    return null
  }

  // Generate state parameter for CSRF protection
  const state = Buffer.from(
    JSON.stringify({
      sessionId,
      timestamp: Date.now(),
    })
  ).toString("base64url")

  const redirectUri = `${appBaseUrl}/api/ucp/identity-linking/callback`

  const authUrl = new URL(`https://${idlinkDomain}/authorize`)
  authUrl.searchParams.set("client_id", idlinkClientId)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("scope", "openid profile email offline_access") // offline_access for refresh token
  authUrl.searchParams.set("prompt", "consent") // Force consent for linking

  // Streamlined linking callback URLs for Google UCP
  // These endpoints allow the OAuth server to check/create/get account info
  authUrl.searchParams.set("check", `${appBaseUrl}/api/ucp/account/check`)
  authUrl.searchParams.set("create", `${appBaseUrl}/api/ucp/account/create`)
  authUrl.searchParams.set("get", `${appBaseUrl}/api/ucp/account/get`)

  return authUrl.toString()
}

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
// Accepts userId from context to enable identity linking
function createCheckoutWithContext(userId?: string) {
  return async (args: any) => {
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

      const sessionId = data.id || data.session_id

      // Generate identity linking URL (requires authenticated user)
      const identityLinkingUrl = generateIdentityLinkingUrl(sessionId, userId)

      console.log("[Checkout] Session created:", sessionId)
      if (identityLinkingUrl) {
        console.log("[Checkout] Identity linking URL generated")
      } else if (!userId) {
        console.log("[Checkout] No identity linking URL - user not authenticated")
      }

      return {
        success: true,
        message: "Checkout session created successfully!",
        checkoutUrl: data.url || data.checkout_url,
        sessionId: sessionId,
        identityLinkingUrl: identityLinkingUrl,
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
}

// Export tools
export const ProductSearchTool = tool({
  description:
    "Search for products in the commerce catalog using UCP protocol. Returns product details including images, prices, and descriptions.",
  parameters: productSearchSchema,
  execute: searchProducts,
})

// CheckoutTool is a function that accepts context to enable identity linking
export const CheckoutTool = (context?: { user?: { id?: string } }) => {
  const userId = context?.user?.id

  return tool({
    description:
      "Create a checkout session for purchasing products. Requires product IDs and quantities from a previous product search. If user is authenticated, an identity linking URL will be provided.",
    parameters: checkoutSchema,
    execute: createCheckoutWithContext(userId),
  })
}
