import { google } from "googleapis"

import { auth0AI } from "./index"
import { Connections } from "./connections"

export const getGoogleAuth = (access_token: string) => {
  // Create Google OAuth client.
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token })
  return auth
}

export const withGoogleCalendarRead = auth0AI.withTokenVault({
  ...Connections.google,
  scopes: ["https://www.googleapis.com/auth/calendar.events.readonly"],
  // https://developers.google.com/workspace/calendar/api/auth
})

export const withGoogleCalendarWrite = auth0AI.withTokenVault({
  ...Connections.google,
  scopes: ["https://www.googleapis.com/auth/calendar.events"],
  // https://developers.google.com/workspace/calendar/api/auth
})

export const withGoogleDriveRead = auth0AI.withTokenVault({
  ...Connections.google,
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  // https://developers.google.com/workspace/calendar/api/auth
})

export const withGoogleDriveWrite = auth0AI.withTokenVault({
  ...Connections.google,
  scopes: ["https://www.googleapis.com/auth/drive"],
  // https://developers.google.com/workspace/calendar/api/auth
})

export const withGmailRead = auth0AI.withTokenVault({
  ...Connections.google,
  scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  // https://developers.google.com/workspace/calendar/api/auth
})

export const withGmailWrite = auth0AI.withTokenVault({
  ...Connections.google,
  scopes: ["https://www.googleapis.com/auth/gmail.modify"],
  // https://developers.google.com/workspace/gmail/api/auth/scopes
})

export const withGmailSend = auth0AI.withTokenVault({
  ...Connections.google,
  scopes: ["https://www.googleapis.com/auth/gmail.send"],
  // https://developers.google.com/workspace/gmail/api/auth/scopes
})
