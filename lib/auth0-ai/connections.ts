import { auth0 } from "@/lib/auth0"

type ConnectionEntry = {
  name: string
  connection: string
  scopes: string[]
  friendlyScopes: string[]
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
  },
}

export const ConnectionsMetadata: ConnectionEntry[] = Object.entries(Connections).map(
  ([name, { connection, scopes, friendlyScopes }]) => ({
    name,
    connection,
    scopes,
    friendlyScopes,
  })
)

// Define a type for the known provider keys
export type ProviderKey = keyof typeof UserScopeMetadata // This will be "google" | "microsoft" | "salesforce" | "xbox"

interface ProviderScopeDetails {
  scopes: readonly string[]
  friendlyScopes: readonly string[]
  userAccountUrl?: string
}

export const UserScopeMetadata = {
  "google-oauth2": {
    userAccountUrl: "https://myaccount.google.com/connections",
    scopes: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/calendar.events.readonly",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive",
    ],
    friendlyScopes: [
      "Read your public profile",
      "See your email address",
      "Read your email messages",
      "Make changes to your mailbox such as moving or deleting messages",
      "Send email on your behalf",
      "Read your calendar events",
      "Create, update, or delete calendar events",
      "Read your files in Google Drive",
      "Write to your files in Google Drive",
    ],
  } as ProviderScopeDetails,
  windowslive: {
    userAccountUrl: "https://account.microsoft.com/privacy/app-access",
    scopes: [
      "offline_access", // REQUIRED for refresh tokens!
      "https://graph.microsoft.com/User.Read",
      "https://graph.microsoft.com/Mail.Read",
      "https://graph.microsoft.com/Mail.ReadWrite",
      "https://graph.microsoft.com/Mail.Send",
      "https://graph.microsoft.com/Calendars.Read",
      "https://graph.microsoft.com/Calendars.ReadWrite",
      "https://graph.microsoft.com/Files.Read",
      "https://graph.microsoft.com/Files.ReadWrite",
    ],
    // https://learn.microsoft.com/en-us/graph/permissions-reference
    friendlyScopes: [
      "Maintain access to data when you're not using this app",
      "Read your public profile",
      "Read your email messages",
      "Make changes to your mailbox such as moving or deleting messages",
      "Send email on your behalf",
      "Read your calendar events",
      "Create, update, or delete calendar events",
      "Read your files in OneDrive",
      "Write to your files in OneDrive",
    ],
  } as ProviderScopeDetails,
  salesforce: {
    userAccountUrl: "#TODO",
    scopes: ["id", "api", "refresh_token"],
    friendlyScopes: [
      "See your Salesforce unique identifier",
      "Read and write data to Salesforce on your behalf",
      "Maintain access to data when you're not using this app",
    ],
  } as ProviderScopeDetails,
  xbox: {
    userAccountUrl: "#TODO",
    scopes: ["XboxLive.signin", "XboxLive.offline_access"],
    // https://learn.microsoft.com/en-us/graph/permissions-reference
    friendlyScopes: [
      "Read information from your Xbox account",
      "Access Xbox information asyncromously",
    ],
  } as ProviderScopeDetails,
} as const
