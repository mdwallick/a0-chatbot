"use client"

import { Connections } from "../lib/auth0-ai/connections"

export type GoogleFile = {
  id: string
  name: string
  url: string
  iconUrl: string
  description: string
  mimeType: string
  lastEditedUtc: number
  content?: string
}

export function GoogleDrivePicker({ onSelect }: { onSelect: (file: GoogleFile) => void }) {
  const pickerCallback = (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const document = data[window.google.picker.Response.DOCUMENTS][0]
      const fileData: GoogleFile = {
        id: document[window.google.picker.Document.ID],
        name: document[window.google.picker.Document.NAME],
        url: document[window.google.picker.Document.URL],
        iconUrl: document[window.google.picker.Document.ICON_URL],
        description: document[window.google.picker.Document.DESCRIPTION],
        mimeType: document[window.google.picker.Document.MIME_TYPE],
        lastEditedUtc: document[window.google.picker.Document.LAST_EDITED_UTC],
      }

      // getGoogleDocById(fileData.id);

      if (onSelect && typeof onSelect === "function") {
        onSelect(fileData)
      }
    } else if (data.action === window.google.picker.Action.CANCEL) {
      console.log("Picker selection canceled")
    }
  }

  const openPicker = async (e: any) => {
    e.stopPropagation()
    e.preventDefault()
    if (!window.google.picker) {
      console.error("Picker API not loaded")
      return
    }

    try {
      const { access_token }: any = await (
        await fetch(`/api/integrations?connection=${Connections.googleDrive.connection}`)
      ).json()

      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        //.addView(window.google.picker.ViewId.FOLDERS)
        //.addView(window.google.picker.ViewId.DOCUMENTS)
        //.addView(window.google.picker.ViewId.SPREADSHEETS)
        // .setOAuthToken(await getGoogleDriveAccessToken())
        .setOAuthToken(access_token)
        .setCallback(pickerCallback)
        .build()

      picker.setVisible(true)
    } catch (error) {
      console.error("Error creating picker:", error)
    }
  }

  return (
    <div className="google-drive-picker cursor-pointer">
      <button onClick={openPicker} className="outline-none cursor-pointer">
        Add from Google Drive
      </button>
    </div>
  )
}
