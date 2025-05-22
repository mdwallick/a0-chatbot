import { Auth0AI } from "@auth0/ai-vercel"
import { google } from "googleapis"

import { Connections } from "./connections"

const auth0AI = new Auth0AI()

export const getGoogleAuth = (access_token: string) => {
  // Create Google OAuth client.
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token })
  return auth
}

export const withGoogleCalendarRead = auth0AI.withTokenForConnection({
  ...Connections.google,
  scopes: ["https://www.googleapis.com/auth/calendar.events.readonly"],
  // https://developers.google.com/workspace/calendar/api/auth
})

export const withGoogleCalendarWrite = auth0AI.withTokenForConnection({
  ...Connections.google,
  scopes: ["https://www.googleapis.com/auth/calendar.events"],
  // https://developers.google.com/workspace/calendar/api/auth
})

export const withGoogleDriveRead = auth0AI.withTokenForConnection({
  ...Connections.google,
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  // https://developers.google.com/workspace/calendar/api/auth
})

export const withGoogleDriveWrite = auth0AI.withTokenForConnection({
  ...Connections.google,
  scopes: ["https://www.googleapis.com/auth/drive"],
  // https://developers.google.com/workspace/calendar/api/auth
})

export const withGmailRead = auth0AI.withTokenForConnection({
  ...Connections.google,
  scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  // https://developers.google.com/workspace/calendar/api/auth
})

export const withGmailWrite = auth0AI.withTokenForConnection({
  ...Connections.google,
  scopes: ["https://www.googleapis.com/auth/gmail.modify"],
  // https://developers.google.com/workspace/gmail/api/auth/scopes
})

export const withGmailSend = auth0AI.withTokenForConnection({
  ...Connections.google,
  scopes: ["https://www.googleapis.com/auth/gmail.send"],
  // https://developers.google.com/workspace/gmail/api/auth/scopes
})
