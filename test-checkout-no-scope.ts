import dotenv from "dotenv"
import path from "path"

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const CHECKOUT_URL =
  "https://3ufw32ejnj76pybzbj6ovbzlvm0zzkur.lambda-url.us-east-1.on.aws/checkout-sessions"

async function testMerchantToken() {
  const merchantDomain = process.env.MERCHANT_DOMAIN
  const merchantClientId = process.env.MERCHANT_CLIENT_ID
  const merchantClientSecret = process.env.MERCHANT_CLIENT_SECRET
  const merchantAudience = process.env.MERCHANT_AUDIENCE

  console.log("\n=== Test WITHOUT scope parameter ===")
  console.log("Domain:", merchantDomain)
  console.log("Client ID:", merchantClientId)
  console.log("Audience:", merchantAudience)

  if (!merchantDomain || !merchantClientId || !merchantClientSecret) {
    throw new Error("Missing merchant credentials")
  }

  const tokenUrl = `https://${merchantDomain}/oauth/token`

  const tokenBody: any = {
    client_id: merchantClientId,
    client_secret: merchantClientSecret,
    grant_type: "client_credentials",
  }

  if (merchantAudience) {
    tokenBody.audience = merchantAudience
  }

  console.log("\nToken request (without scope):", {
    ...tokenBody,
    client_secret: "***",
  })

  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tokenBody),
    })

    console.log("\nToken response status:", tokenResponse.status, tokenResponse.statusText)

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error("\n❌ Token request failed!")
      console.error("Error response:", JSON.stringify(tokenData, null, 2))
      return
    }

    console.log("\n✅ Token received successfully!")
    console.log(
      "Access token:",
      tokenData.access_token ? `${tokenData.access_token.substring(0, 20)}...` : "NOT PRESENT"
    )
    console.log("Token type:", tokenData.token_type)
    console.log("Expires in:", tokenData.expires_in, "seconds")
    if (tokenData.scope) {
      console.log("Granted scope:", tokenData.scope)
    }

    // Step 2: Test checkout with the token
    console.log("\n=== Testing Checkout Session Creation ===")

    const checkoutBody = {
      line_items: [
        {
          item: {
            id: "pony-001",
            title: "Miniature Pony - Butterscotch",
          },
          quantity: 1,
        },
      ],
      currency: "USD",
    }

    const checkoutResponse = await fetch(CHECKOUT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify(checkoutBody),
    })

    console.log("\nCheckout response status:", checkoutResponse.status, checkoutResponse.statusText)

    const checkoutData = await checkoutResponse.text()

    if (!checkoutResponse.ok) {
      console.error("\n❌ Checkout request failed!")
      console.error("Error response:", checkoutData)

      try {
        const jsonError = JSON.parse(checkoutData)
        console.error("Parsed error:", JSON.stringify(jsonError, null, 2))
      } catch {
        // Not JSON
      }
      return
    }

    console.log("\n✅ Checkout session created successfully!")

    try {
      const checkoutJson = JSON.parse(checkoutData)
      console.log("Checkout response:", JSON.stringify(checkoutJson, null, 2))

      if (checkoutJson.url || checkoutJson.checkout_url) {
        console.log("\n🔗 Checkout URL:", checkoutJson.url || checkoutJson.checkout_url)
      }
    } catch {
      console.log("Checkout response (text):", checkoutData)
    }
  } catch (error) {
    console.error("\n❌ Error occurred:")
    console.error(error)
  }
}

testMerchantToken()
