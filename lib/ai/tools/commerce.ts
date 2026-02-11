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

// Get OAuth token for commerce API
async function getCommerceToken(): Promise<string> {
  const auth0Domain = process.env.AUTH0_DOMAIN
  if (!auth0Domain) {
    throw new Error("AUTH0_DOMAIN not configured")
  }

  const tokenUrl = `https://${auth0Domain}/oauth/token`

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: "https://checkout-api.example.com",
        grant_type: "client_credentials",
      }),
    })

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.statusText}`)
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
      return { error: "Failed to fetch products", products: [] }
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

    // Format products as markdown with images
    const markdown = limitedProducts
      .map((product: any, index: number) => {
        const title = product.title || "Product"
        const price = product.price ? `$${product.price}` : "Price not available"
        const description = product.description || ""
        const image = product.image_url || product.imageUrl || ""
        const productId = product.id || product.product_id || ""

        let result = `${index + 1}. **${title}** - ${price}\n`
        if (image) {
          result += `![${title}](${image})\n`
        }
        if (description) {
          result += `${description}\n`
        }
        result += `Product ID: ${productId}`

        return result
      })
      .join("\n\n---\n\n")

    return {
      message: `Found ${limitedProducts.length} product(s) matching "${query}"`,
      products: limitedProducts,
      formatted: markdown,
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
    const token = await getCommerceToken()

    // Format line items for checkout API
    const formattedLineItems = lineItems.map((item: any) => ({
      item: {
        id: item.productId,
        title: item.productTitle,
      },
      quantity: item.quantity,
    }))

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

    if (!response.ok) {
      const errorText = await response.text()
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
  parameters: productSearchSchema,
  execute: searchProducts,
})

export const CheckoutTool = tool({
  description:
    "Create a checkout session for purchasing products. Requires product IDs and quantities from a previous product search.",
  parameters: checkoutSchema,
  execute: createCheckout,
})
