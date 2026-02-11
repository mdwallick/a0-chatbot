import dotenv from "dotenv"
import path from "path"

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

// Test the identity linking URL generation directly
function testIdentityLinkingUrlGeneration() {
  console.log("\n=== Testing Identity Linking URL Generation ===\n")

  const idlinkClientId = process.env.MERCHANT_IDLINK_CLIENT_ID
  const idlinkDomain = process.env.MERCHANT_IDLINK_DOMAIN
  const appBaseUrl = process.env.APP_BASE_URL || process.env.AUTH0_BASE_URL

  console.log("Configuration:")
  console.log("- Client ID:", idlinkClientId)
  console.log("- Domain:", idlinkDomain)
  console.log("- App Base URL:", appBaseUrl)
  console.log()

  if (!idlinkClientId || !idlinkDomain || !appBaseUrl) {
    console.error("❌ Missing required configuration")
    return
  }

  // Simulate a checkout session
  const mockSessionId = "gid://merchant.example.com/Checkout/session_test_123"

  // Generate state parameter
  const state = Buffer.from(
    JSON.stringify({
      sessionId: mockSessionId,
      timestamp: Date.now(),
    })
  ).toString("base64url")

  const redirectUri = `${appBaseUrl}/api/ucp/identity-linking/callback`

  const authUrl = new URL(`https://${idlinkDomain}/authorize`)
  authUrl.searchParams.set("client_id", idlinkClientId)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("scope", "openid profile email offline_access")
  authUrl.searchParams.set("prompt", "consent")

  console.log("✅ Identity Linking URL Generated:\n")
  console.log(authUrl.toString())
  console.log()

  console.log("URL Components:")
  console.log("- Authorization endpoint:", `${authUrl.origin}${authUrl.pathname}`)
  console.log("- Client ID:", authUrl.searchParams.get("client_id"))
  console.log("- Response type:", authUrl.searchParams.get("response_type"))
  console.log("- Redirect URI:", authUrl.searchParams.get("redirect_uri"))
  console.log("- Scope:", authUrl.searchParams.get("scope"))
  console.log("- Prompt:", authUrl.searchParams.get("prompt"))
  console.log("- State (encoded session):", state.substring(0, 40) + "...")
  console.log()

  // Decode state to verify
  const decodedState = JSON.parse(Buffer.from(state, "base64url").toString())
  console.log("Decoded State:")
  console.log("- Session ID:", decodedState.sessionId)
  console.log("- Timestamp:", new Date(decodedState.timestamp).toISOString())
  console.log()

  console.log("📋 Testing Instructions:")
  console.log("1. Start your dev server: npm run dev")
  console.log("2. Copy the URL above and paste it in your browser")
  console.log("3. Complete the OAuth authorization flow")
  console.log("4. You will be redirected to:", redirectUri)
  console.log("5. Check server logs for [Identity Linking] messages")
}

testIdentityLinkingUrlGeneration()
