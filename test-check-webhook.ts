import dotenv from "dotenv"
import path from "path"

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

/**
 * Test the /check webhook with a mock JWT assertion
 *
 * This simulates what the merchant OAuth server would send
 */
async function testCheckWebhook() {
  console.log("\n=== Testing /api/ucp/account/check Webhook ===\n")

  // Create a mock JWT assertion
  // In production, this would be a real JWT signed by the merchant
  const mockClaims = {
    sub: "auth0|merchant_test_user_123",
    email: "test@example.com",  // Email to search in chatbot Auth0
    name: "Test User",
    iss: "https://agentic-commerce-merchant.cic-demo-platform.auth0app.com/",
    aud: "U5xtIqc7cu707C28nQHeCKplg9ec2VPe",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300,
  }

  // Create base64url encoded JWT (simplified - no signature)
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(JSON.stringify(mockClaims)).toString("base64url")
  const mockJwt = `${header}.${payload}.mock_signature`

  console.log("Mock JWT Claims:")
  console.log("  - Merchant User ID:", mockClaims.sub)
  console.log("  - Email:", mockClaims.email)
  console.log("  - Name:", mockClaims.name)
  console.log()

  console.log("Calling /api/ucp/account/check webhook...")
  console.log()

  try {
    const response = await fetch("http://localhost:3000/api/ucp/account/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assertion: mockJwt,
        intent: "check",
      }),
    })

    console.log("Response Status:", response.status, response.statusText)
    console.log()

    const data = await response.json()
    console.log("Response Body:")
    console.log(JSON.stringify(data, null, 2))
    console.log()

    if (data.account_found) {
      console.log("✅ ACCOUNT FOUND!")
      console.log("  - Chatbot User ID:", data.user_id)
      console.log("  - Match Method:", data.match_method)

      if (data.match_method === "database_link") {
        console.log("  - Linked At:", data.linked_at)
        console.log()
        console.log("This means:")
        console.log("  → Merchant user is already linked to chatbot user")
        console.log("  → Skip account creation step")
      } else if (data.match_method === "email_lookup") {
        console.log("  - Email:", data.email)
        console.log("  - Email Verified:", data.email_verified)
        console.log()
        console.log("This means:")
        console.log("  → Chatbot user exists with same email")
        console.log("  → Can automatically link accounts")
        console.log("  → No new account creation needed")
      }
    } else {
      console.log("❌ ACCOUNT NOT FOUND")
      console.log("  - Merchant User ID:", data.merchant_user_id)
      console.log("  - Merchant Email:", data.merchant_email)
      console.log()
      console.log("This means:")
      console.log("  → No existing link in database")
      console.log("  → No chatbot user with this email")
      console.log("  → Need to call /create endpoint")
    }

  } catch (error) {
    console.error("❌ Error:", error)
    console.error()
    console.error("Make sure:")
    console.error("  1. Dev server is running: npm run dev")
    console.error("  2. Auth0 M2M credentials are configured in .env.local")
    console.error("  3. M2M client has 'read:users' scope")
  }
}

console.log("\n" + "=".repeat(80))
console.log("Streamlined Linking - Check Webhook Test")
console.log("=".repeat(80))

testCheckWebhook()
