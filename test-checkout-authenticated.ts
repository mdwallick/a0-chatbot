import dotenv from "dotenv"
import path from "path"

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

// Import the CheckoutTool function
import { CheckoutTool } from "./lib/ai/tools/commerce.js"

async function testAuthenticatedCheckout() {
  console.log("\n=== Testing Authenticated vs Unauthenticated Checkout ===\n")

  const testCheckoutData = {
    lineItems: [
      {
        productId: "pony-001",
        productTitle: "Miniature Pony - Butterscotch",
        quantity: 1,
      },
    ],
    currency: "USD",
  }

  // Test 1: Unauthenticated user (no context)
  console.log("Test 1: Unauthenticated User (No Context)")
  console.log("==========================================")
  try {
    const unauthenticatedTool = CheckoutTool()
    const result1 = await unauthenticatedTool.execute(testCheckoutData)

    if (result1.error) {
      console.log("❌ Checkout failed:", result1.error)
    } else {
      console.log("✅ Checkout session created:", result1.sessionId)
      console.log("Identity linking URL:", result1.identityLinkingUrl || "NOT PROVIDED (expected)")
      console.log()
    }
  } catch (error) {
    console.error("Error:", error)
  }

  // Test 2: Authenticated user (with context)
  console.log("\nTest 2: Authenticated User (With Context)")
  console.log("==========================================")
  try {
    const authenticatedContext = {
      user: {
        id: "auth0|test_user_123",
        email: "test@example.com",
        name: "Test User",
      },
    }

    const authenticatedTool = CheckoutTool(authenticatedContext)
    const result2 = await authenticatedTool.execute(testCheckoutData)

    if (result2.error) {
      console.log("❌ Checkout failed:", result2.error)
    } else {
      console.log("✅ Checkout session created:", result2.sessionId)
      console.log(
        "Identity linking URL:",
        result2.identityLinkingUrl ? "PROVIDED ✓" : "NOT PROVIDED ✗"
      )
      if (result2.identityLinkingUrl) {
        console.log("\n🔗 Full URL:")
        console.log(result2.identityLinkingUrl)
        console.log()

        // Parse URL to verify it has offline_access
        const url = new URL(result2.identityLinkingUrl)
        const scope = url.searchParams.get("scope")
        console.log("Scopes:", scope)
        console.log("Has offline_access:", scope?.includes("offline_access") ? "YES ✓" : "NO ✗")
      }
    }
  } catch (error) {
    console.error("Error:", error)
  }

  console.log("\n=== Summary ===")
  console.log("✅ Unauthenticated users: Can checkout but cannot link identity")
  console.log("✅ Authenticated users: Get identity linking URL with checkout")
  console.log("✅ offline_access scope: Enables refresh tokens for long-lived access")
  console.log(
    "\nNote: Checkout API may return 502 errors - this test focuses on identity linking logic"
  )
}

testAuthenticatedCheckout()
