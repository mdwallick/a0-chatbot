import { Auth0AI } from "@auth0/ai-vercel"

/**
 * Centralized Auth0AI instance configuration
 *
 * This instance is used across all provider-specific files to ensure
 * consistent configuration for token vault access.
 *
 * IMPORTANT: This file should only be imported in server-side code!
 * The Auth0AI SDK requires server-only environment variables.
 */

// Ensure this only runs on server (not in browser)
if (typeof window !== "undefined") {
  throw new Error("Auth0AI must only be initialized on the server side")
}

export const auth0AI = new Auth0AI({
  auth0: {
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_CLIENT_ID!,
    clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  },
})
