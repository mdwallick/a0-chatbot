import dotenv from "dotenv"
import path from "path"

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

// Import the actual tool
import { CheckoutTool } from "./lib/ai/tools/commerce.js"

async function testIdentityLinking() {
  console.log("\n=== Testing UCP Identity Linking ===\n")

  // Check configuration
  console.log("Identity Linking Configuration:")
  console.log("- Client ID:", process.env.MERCHANT_IDLINK_CLIENT_ID)
  console.log(
    "- Client Secret:",
    process.env.MERCHANT_IDLINK_CLIENT_SECRET
      ? `${process.env.MERCHANT_IDLINK_CLIENT_SECRET.substring(0, 10)}...`
      : "NOT SET"
  )
  console.log("- Domain:", process.env.MERCHANT_IDLINK_DOMAIN)
  console.log("- App Base URL:", process.env.APP_BASE_URL || process.env.AUTH0_BASE_URL)
  console.log()

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

  console.log("Creating checkout with products:", JSON.stringify(testCheckout, null, 2))
  console.log()

  try {
    const result = await CheckoutTool.execute(testCheckout)

    if (result.error) {
      console.error("❌ Checkout failed!")
      console.error("Error:", result.error)
      if (result.details) {
        console.error("Details:", result.details)
      }
      return
    }

    console.log("✅ Checkout session created successfully!")
    console.log()
    console.log("Session ID:", result.sessionId)
    console.log("Status:", result.status)
    console.log()

    if (result.identityLinkingUrl) {
      console.log("🔗 Identity Linking URL:")
      console.log(result.identityLinkingUrl)
      console.log()
      console.log("To test identity linking:")
      console.log("1. Copy the URL above")
      console.log("2. Open it in your browser")
      console.log("3. Complete the OAuth authorization flow")
      console.log("4. You'll be redirected back to the app with the linked identity")
      console.log()

      // Parse the URL to show details
      const url = new URL(result.identityLinkingUrl)
      console.log("Authorization URL Details:")
      console.log("- Domain:", url.hostname)
      console.log("- Client ID:", url.searchParams.get("client_id"))
      console.log("- Redirect URI:", url.searchParams.get("redirect_uri"))
      console.log("- Scope:", url.searchParams.get("scope"))
      console.log("- State (base64url):", url.searchParams.get("state")?.substring(0, 30) + "...")
    } else {
      console.log("⚠️  No identity linking URL generated")
      console.log("Check that MERCHANT_IDLINK_* environment variables are set")
    }
  } catch (error) {
    console.error("\n❌ Error occurred:")
    console.error(error)
  }
}

testIdentityLinking()
