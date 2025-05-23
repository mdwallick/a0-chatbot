import { auth0 } from "@/lib/auth0"

type ConnectionEntry = {
  name: string
  connection: string
  scopes: string[]
  friendlyScopes: string[]
  userAccountUrl: string
}

export const Connections = {
  google: {
    connection: "google-oauth2",
    refreshToken: async () => {
      const session = await auth0.getSession()
      const refreshToken = session?.tokenSet.refreshToken as string
      return refreshToken
    },
    scopes: [],
    friendlyScopes: [
      "Read your email",
      "Make changes to your mailbox such as moving or deleting messages",
      "Send email on your behalf",
      "Read your calendar events",
      "Create, update, or delete calendar events",
      "Read and write to your files in Google Drive",
    ],
    userAccountUrl: "https://myaccount.google.com/connections",
  },
  microsoft: {
    connection: "windowslive",
    refreshToken: async () => {
      const session = await auth0.getSession()
      const refreshToken = session?.tokenSet.refreshToken as string
      return refreshToken
    },
    scopes: [],
    // https://learn.microsoft.com/en-us/graph/permissions-reference
    friendlyScopes: [
      "Read your email",
      "Make changes to your mailbox such as moving or deleting messages",
      "Send email on your behalf",
      "Read your calendar events",
      "Create, update, or delete calendar events",
      "Read and write to your files in OneDrive",
    ],
    userAccountUrl: "https://account.microsoft.com/privacy/app-access",
  },
  salesforce: {
    connection: "salesforce",
    refreshToken: async () => {
      const session = await auth0.getSession()
      const refreshToken = session?.tokenSet.refreshToken as string
      return refreshToken
    },
    scopes: [],
    friendlyScopes: ["Read and write data to Salesforce as your user."],
    userAccountUrl: "",
  },
  xbox: {
    connection: "xbox",
    refreshToken: async () => {
      const session = await auth0.getSession()
      const refreshToken = session?.tokenSet.refreshToken as string
      return refreshToken
    },
    scopes: [],
    // https://learn.microsoft.com/en-us/graph/permissions-reference
    friendlyScopes: ["Read information from your profile"],
    userAccountUrl: "",
  },
}

export const ConnectionsMetadata: ConnectionEntry[] = Object.entries(Connections).map(
  ([name, { connection, scopes, friendlyScopes, userAccountUrl }]) => ({
    name,
    connection,
    scopes,
    friendlyScopes,
    userAccountUrl,
  })
)
