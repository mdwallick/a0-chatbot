import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel"

/**
 * Debug wrapper around getAccessTokenFromTokenVault to help troubleshoot
 * token vault issues
 */
export function debugGetAccessToken(connectionName: string): string {
  console.log(`[Token Debug] Attempting to get token for connection: ${connectionName}`)

  try {
    const token = getAccessTokenFromTokenVault()

    if (!token) {
      console.error(`[Token Debug] ERROR: getAccessTokenFromTokenVault returned: ${token}`)
      console.error(`[Token Debug] Token is falsy - this means the token vault failed`)
      throw new Error(`No access token available for connection: ${connectionName}`)
    }

    if (typeof token !== "string") {
      console.error(`[Token Debug] ERROR: Token is not a string:`, typeof token, token)
      throw new Error(`Invalid token type for connection: ${connectionName}`)
    }

    if (token.length < 10) {
      console.error(`[Token Debug] ERROR: Token seems too short:`, token.length)
      throw new Error(`Invalid token length for connection: ${connectionName}`)
    }

    console.log(`[Token Debug] SUCCESS: Got valid token (length: ${token.length})`)
    console.log(`[Token Debug] Token preview: ${token.substring(0, 30)}...`)

    return token
  } catch (error) {
    console.error(`[Token Debug] EXCEPTION while getting token:`, error)
    if (error instanceof Error) {
      console.error(`[Token Debug] Error name: ${error.name}`)
      console.error(`[Token Debug] Error message: ${error.message}`)
      console.error(`[Token Debug] Error stack:`, error.stack)
    }
    throw error
  }
}
