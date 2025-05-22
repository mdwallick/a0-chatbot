import { Auth0AI } from "@auth0/ai-vercel"
import { Connections } from "./connections"

const auth0AI = new Auth0AI()

export const withMSCalendarRead = auth0AI.withTokenForConnection({
  ...Connections.microsoft,
  scopes: ["Calendars.Read"],
  // https://learn.microsoft.com/en-us/graph/permissions-reference
})

export const withMSCalendarWrite = auth0AI.withTokenForConnection({
  ...Connections.microsoft,
  scopes: ["Calendars.ReadWrite"],
  // https://learn.microsoft.com/en-us/graph/permissions-reference
})

export const withMSOneDriveRead = auth0AI.withTokenForConnection({
  ...Connections.microsoft,
  scopes: ["Files.Read"],
  // https://learn.microsoft.com/en-us/graph/permissions-reference
})

export const withMSOneDriveWrite = auth0AI.withTokenForConnection({
  ...Connections.microsoft,
  scopes: ["Files.ReadWrite"],
  // https://learn.microsoft.com/en-us/graph/permissions-reference
})

export const withMSMailRead = auth0AI.withTokenForConnection({
  ...Connections.microsoft,
  scopes: ["Mail.Read"],
  // https://learn.microsoft.com/en-us/graph/permissions-reference
})

export const withMSMailWrite = auth0AI.withTokenForConnection({
  ...Connections.microsoft,
  scopes: ["Mail.ReadWrite"],
  // https://learn.microsoft.com/en-us/graph/permissions-reference
})

export const withMSMailSend = auth0AI.withTokenForConnection({
  ...Connections.microsoft,
  scopes: ["Mail.Send"],
  // https://learn.microsoft.com/en-us/graph/permissions-reference
})
