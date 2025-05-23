import { IRevocationService } from "./interfaces"
import type { TokenSet } from "./interfaces"

class GoogleRevocationService implements IRevocationService {
  providerName = "google"
  async revoke(tokens: TokenSet) {
    const tokenToRevoke = tokens.refreshToken || tokens.accessToken
    if (!tokenToRevoke) return false
    try {
      const response = await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: tokenToRevoke }),
      })
      // Google returns 200 OK even for invalid/revoked tokens, which is often OK for disconnect.
      return response.ok
    } catch (error) {
      console.error("Google revocation failed:", error)
      return false // Or throw a specific error
    }
  }
}
