import { auth0AI } from "./index"
import { Connections } from "./connections"

// Note: offline_access is needed during consent flow to get refresh tokens,
// but should NOT be included in the withTokenVault scopes check.
// The Token Vault stores refresh tokens separately and offline_access
// won't appear in the returned access token scopes.
// https://learn.microsoft.com/en-us/graph/permissions-reference

export const withMSCalendarRead = auth0AI.withTokenVault({
  ...Connections.microsoft,
  scopes: ["https://graph.microsoft.com/Calendars.Read"],
})

export const withMSCalendarWrite = auth0AI.withTokenVault({
  ...Connections.microsoft,
  scopes: ["https://graph.microsoft.com/Calendars.ReadWrite"],
})

export const withMSOneDriveRead = auth0AI.withTokenVault({
  ...Connections.microsoft,
  scopes: ["https://graph.microsoft.com/Files.Read"],
})

export const withMSOneDriveWrite = auth0AI.withTokenVault({
  ...Connections.microsoft,
  scopes: ["https://graph.microsoft.com/Files.ReadWrite"],
})

export const withMSMailRead = auth0AI.withTokenVault({
  ...Connections.microsoft,
  scopes: ["https://graph.microsoft.com/Mail.Read"],
})

export const withMSMailWrite = auth0AI.withTokenVault({
  ...Connections.microsoft,
  scopes: ["https://graph.microsoft.com/Mail.ReadWrite"],
})

export const withMSMailSend = auth0AI.withTokenVault({
  ...Connections.microsoft,
  scopes: ["https://graph.microsoft.com/Mail.Send"],
})
