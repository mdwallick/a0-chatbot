// Client-safe connection metadata (no server-side imports)

type ConnectionEntry = {
  name: string
  connection: string
  scopes: string[]
  friendlyScopes: string[]
}

interface ProviderScopeDetails {
  scopes: readonly string[]
  friendlyScopes: readonly string[]
  userAccountUrl?: string
}

export const ConnectionsMetadata: ConnectionEntry[] = [
  {
    name: "google",
    connection: "google-oauth2",
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
  {
    name: "microsoft",
    connection: "windowslive",
    scopes: [],
    friendlyScopes: [
      "Read your email",
      "Make changes to your mailbox such as moving or deleting messages",
      "Send email on your behalf",
      "Read your calendar events",
      "Create, update, or delete calendar events",
      "Read and write to your files in OneDrive",
    ],
  },
  {
    name: "salesforce",
    connection: "salesforce",
    scopes: [],
    friendlyScopes: ["Read and write data to Salesforce as your user."],
  },
  {
    name: "xbox",
    connection: "xbox",
    scopes: [],
    friendlyScopes: ["Read information from your profile"],
  },
]

export type ProviderKey = keyof typeof UserScopeMetadata

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
      "https://graph.microsoft.com/User.Read",
      "https://graph.microsoft.com/Mail.Read",
      "https://graph.microsoft.com/Mail.ReadWrite",
      "https://graph.microsoft.com/Mail.Send",
      "https://graph.microsoft.com/Calendars.Read",
      "https://graph.microsoft.com/Calendars.ReadWrite",
      "https://graph.microsoft.com/Files.Read",
      "https://graph.microsoft.com/Files.ReadWrite",
    ],
    friendlyScopes: [
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
    friendlyScopes: [
      "Read information from your Xbox account",
      "Access Xbox information asyncromously",
    ],
  } as ProviderScopeDetails,
} as const
