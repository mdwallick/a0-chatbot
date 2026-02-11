import { auth0 } from "@/lib/auth0"

// Server-only connection handlers with refresh token functions
// For client-safe metadata, import from "./connections-metadata"
export const Connections = {
  google: {
    connection: "google-oauth2",
    refreshToken: async () => {
      const session = await auth0.getSession()
      const refreshToken = session?.tokenSet.refreshToken as string
      return refreshToken
    },
  },
  microsoft: {
    connection: "windowslive",
    refreshToken: async () => {
      const session = await auth0.getSession()
      const refreshToken = session?.tokenSet.refreshToken as string
      return refreshToken
    },
  },
  salesforce: {
    connection: "salesforce",
    refreshToken: async () => {
      const session = await auth0.getSession()
      const refreshToken = session?.tokenSet.refreshToken as string
      return refreshToken
    },
  },
  xbox: {
    connection: "xbox",
    refreshToken: async () => {
      const session = await auth0.getSession()
      const refreshToken = session?.tokenSet.refreshToken as string
      return refreshToken
    },
  },
}
