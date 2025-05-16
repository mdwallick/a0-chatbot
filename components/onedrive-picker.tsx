"use client"

import { useState } from "react"

import { Connections } from "../lib/auth0-ai/connections"

declare global {
  interface Window {
    OneDrive: {
      open: (options: any) => void
    }
  }
}

export type OneDriveFile = {
  id: string
  name: string
  url: string
  iconUrl?: string
  description?: string
  mimeType: string
  lastModifiedDateTime: string
  content?: string
  metadata?: {
    type: string
  }
}

export function OneDrivePicker({ onSelect }: { onSelect: (file: OneDriveFile) => void }) {
  const [loading, setLoading] = useState(false)

  const handleFileSelect = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get access token for OneDrive
      const { access_token }: any = await (
        await fetch(`/api/integrations?connection=${Connections.windowsLive.connection}`)
      ).json()

      // Fetch recent files from OneDrive using Microsoft Graph API
      const response = await fetch("https://graph.microsoft.com/v1.0/me/drive/recent", {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`)
      }

      const data = await response.json()

      // Create modal for file selection
      const modal = document.createElement("div")
      modal.className = "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] flex flex-col">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">Select a file from OneDrive</h2>
            <button class="text-gray-500 hover:text-gray-700" id="close-modal">×</button>
          </div>
          <div class="overflow-y-auto flex-1">
            ${data.value
              .map(
                (file: any) => `
              <button class="w-full text-left p-3 hover:bg-gray-100 flex items-center gap-3 file-select" data-file-id="${file.id}">
                <img src="${file.thumbnails?.[0]?.small?.url || ""}" class="w-8 h-8 object-cover" onerror="this.style.display='none'" />
                <div>
                  <div class="font-medium">${file.name}</div>
                  <div class="text-sm text-gray-500">Modified: ${new Date(file.lastModifiedDateTime).toLocaleDateString()}</div>
                </div>
              </button>
            `
              )
              .join("")}
          </div>
        </div>
      `

      document.body.appendChild(modal)

      // Add event listeners
      const closeModal = () => {
        document.body.removeChild(modal)
      }

      modal.querySelector("#close-modal")?.addEventListener("click", closeModal)
      modal.addEventListener("click", e => {
        if (e.target === modal) closeModal()
      })

      // Handle file selection
      modal.querySelectorAll(".file-select").forEach(button => {
        button.addEventListener("click", async () => {
          const fileId = (button as HTMLElement).dataset.fileId
          if (!fileId) return

          // Fetch specific file details
          const fileResponse = await fetch(
            `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`,
            {
              headers: {
                Authorization: `Bearer ${access_token}`,
                Accept: "application/json",
              },
            }
          )

          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch file details: ${fileResponse.statusText}`)
          }

          const fileData = await fileResponse.json()

          const file: OneDriveFile = {
            id: fileData.id,
            name: fileData.name,
            url: fileData["@microsoft.graph.downloadUrl"] || fileData.webUrl,
            mimeType: fileData.file.mimeType,
            lastModifiedDateTime: fileData.lastModifiedDateTime,
            description: fileData.description || "",
          }

          onSelect(file)
          closeModal()
        })
      })
    } catch (error) {
      console.error("Error fetching OneDrive files:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleFileSelect}
      className="outline-none cursor-pointer w-full text-left flex items-center"
      disabled={loading}
    >
      {loading ? "Loading..." : "Add from OneDrive"}
    </button>
  )
}
