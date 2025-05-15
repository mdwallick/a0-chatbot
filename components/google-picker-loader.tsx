"use client"

import { useEffect } from "react"

declare global {
  interface Window {
    gapi: any
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any
        }
      }
      picker: {
        PickerBuilder: any
        Action: any
        ViewId: any
        Response: any
        Document: any
      }
    }
  }
}

export const GooglePickerLoader = () => {
  useEffect(() => {
    const loadGoogleLibraries = () => {
      const gapiScript = document.createElement("script")
      gapiScript.src = "https://apis.google.com/js/api.js"
      gapiScript.async = true
      gapiScript.defer = true
      gapiScript.onload = () => {
        window.gapi.load("picker", () => {
          console.log("Google Picker API loaded")
        })
      }
      document.body.appendChild(gapiScript)

      const gisScript = document.createElement("script")
      gisScript.src = "https://accounts.google.com/gsi/client"
      gisScript.async = true
      gisScript.defer = true
      document.body.appendChild(gisScript)
    }

    loadGoogleLibraries()
  }, [])

  return null
}
