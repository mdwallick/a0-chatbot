import { google } from "googleapis"
import { NextRequest, NextResponse } from "next/server"

import { auth0 } from "@/lib/auth0"
import { Connections } from "@/lib/auth0-ai/connections"

export async function GET(request: NextRequest) {
  const documentId = request.nextUrl.searchParams.get("documentID")!
  const token = await auth0.getAccessTokenForConnection({
    connection: Connections.google.connection,
  })

  const docs = google.docs({ version: "v1" })
  const auth = new google.auth.OAuth2()

  auth.setCredentials({
    access_token: token.token,
  })

  const response = await docs.documents.get({ documentId, auth })
  const content = response.data.body!.content!
  let textContent = ""

  content.forEach(element => {
    if (element.paragraph) {
      element.paragraph.elements!.forEach(textRun => {
        if (textRun.textRun) {
          textContent += textRun.textRun.content
        }
      })
    }
  })

  return NextResponse.json({
    content: textContent,
  })
}
