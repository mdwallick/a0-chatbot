import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel"
import { TokenVaultError } from "@auth0/ai/interrupts"
import { google } from "googleapis"

import { getGoogleAuth, withGoogleDriveWrite } from "@/lib/auth0-ai/google"

const createFolderSchema = z.object({
  folderName: z.string().describe("The name of the new folder to create"),
  parentFolderId: z
    .string()
    .optional()
    .nullable()
    .describe("The ID of the parent folder. Use 'root' for My Drive top level (default)."),
})

export const GoogleFolderCreateTool = withGoogleDriveWrite(
  tool({
    description: "Create a new folder in Google Drive",
    inputSchema: createFolderSchema,
    execute: async ({ folderName, parentFolderId }) => {
      const logs: string[] = []

      try {
        const access_token = getAccessTokenFromTokenVault()
        logs.push("Got access token from token vault")

        const auth = getGoogleAuth(access_token)
        const drive = google.drive({ version: "v3", auth })

        const parents = parentFolderId ? [parentFolderId] : ["root"]
        logs.push(`Creating folder "${folderName}" in parent: ${parents[0]}`)

        const fileMetadata = {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: parents,
        }

        const res = await drive.files.create({
          requestBody: fileMetadata,
          fields: "id, name, mimeType, webViewLink, parents",
        })

        const newFolder = res.data
        logs.push(`Folder created successfully: ${newFolder.name} (ID: ${newFolder.id})`)

        return {
          logs,
          folder: {
            id: newFolder.id,
            name: newFolder.name,
            mimeType: newFolder.mimeType,
            webViewLink: newFolder.webViewLink,
            parents: newFolder.parents,
          },
        }
      } catch (error) {
        if (error instanceof GaxiosError) {
          if (error.status === 400) {
            logs.push(`Bad request: ${error.message}`)
            return {
              error: `Invalid request: ${error.message}`,
              logs,
            }
          }
          if (error.status === 401) {
            throw new TokenVaultError(`Authorization required to access the Federated Connection`)
          }
          logs.push(`API Error: ${error.status} - ${error.message}`)
        }
        console.error("Error creating folder:", error)
        throw error
      }
    },
  })
)
