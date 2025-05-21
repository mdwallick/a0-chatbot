type ConnectionEntry = {
  name: string
  connection: string
  scopes: string[]
  friendlyScopes: string[]
}

export const Connections = {
  googleDrive: {
    connection: "google-oauth2",
    scopes: ["https://www.googleapis.com/auth/drive"],
    // https://developers.google.com/workspace/drive/api/guides/api-specific-auth
    friendlyScopes: ["View and manage all your Drive files."],
  },
  googleCalendar: {
    connection: "google-oauth2",
    scopes: ["https://www.googleapis.com/auth/calendar.freebusy"],
    // https://developers.google.com/workspace/calendar/api/auth
    friendlyScopes: ["View your availability in your calendars."],
  },
  slack: {
    connection: "sign-in-with-slack",
    scopes: ["channels:read", "groups:read"],
    // https://api.slack.com/scopes
    friendlyScopes: [
      "View basic information about public channels in a workspace.",
      "View basic information about private channels that your slack app has been added to.",
    ],
  },
  windowsLive: {
    connection: "windowslive",
    scopes: ["Mail.Send", "Mail.ReadWrite", "Calendars.ReadWrite", "Files.ReadWrite"],
    // https://learn.microsoft.com/en-us/graph/permissions-reference
    friendlyScopes: [
      "Send mail on your behalf",
      "Read and write mail in your mailbox",
      "Read and write to your calendar",
      "Read and write files in your OneDrive",
    ],
  },
  xbox: {
    connection: "xbox",
    scopes: ["XboxLive.signin", "XboxLive.offline_access"],
    // https://learn.microsoft.com/en-us/graph/permissions-reference
    friendlyScopes: ["Sign in to your Xbox Account", "Access Xbox data you have authorized"],
  },
  salesforce: {
    connection: "salesforce",
    scopes: ["api"],
    friendlyScopes: ["Read and write data to Salesforce as your user."],
  },
  box: {
    connection: "box",
    scopes: ["root_readonly"],
    // https://developer.box.com/guides/api-calls/permissions-and-errors/scopes/
    friendlyScopes: ["Read all files and folders stored in Box."],
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
