import dotenv from "dotenv"
import path from "path"

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

// Import the actual tool
import { CheckoutTool } from "./lib/ai/tools/commerce.js"

async function testCheckoutTool() {
  console.log("\n=== Testing CheckoutTool directly ===\n")

  const testCheckout = {
    lineItems: [
      {
        productId: "pony-001",
        productTitle: "Miniature Pony - Butterscotch",
        quantity: 1,
      },
    ],
    currency: "USD",
  }

  console.log("Checkout input:", JSON.stringify(testCheckout, null, 2))

  try {
    const result = await CheckoutTool.execute(testCheckout)

    console.log("\n✅ Checkout completed!")
    console.log("Result:", JSON.stringify(result, null, 2))
  } catch (error) {
    console.error("\n❌ Checkout failed!")
    console.error("Error:", error)
  }
}

testCheckoutTool()
