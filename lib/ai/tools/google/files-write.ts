import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel"
import { TokenVaultError } from "@auth0/ai/interrupts"
import { google } from "googleapis"
import stream from "stream" // Needed for creating a stream from a string/buffer

import { getGoogleAuth, withGoogleDriveWrite } from "@/lib/auth0-ai/google"
import { OAuth2Client } from "google-auth-library"

const writeSchema = z.object({
  path: z.string().describe("Full path to the file in Google Drive (e.g. /Documents/example.docx)"),
  content: z.string().describe("Content to write to the file"),
  type: z.enum(["text", "doc", "sheet"]).describe("Type of file to create"),
})

export const GoogleFilesWriteTool = withGoogleDriveWrite(
  tool({
    description: "Create and edit files in Google Drive",
    inputSchema: writeSchema,
    execute: async ({ path, content, type }) => {
      try {
        const access_token = getAccessTokenFromTokenVault()

        // Create Google OAuth client.
        const auth = getGoogleAuth(access_token)

        if (type === "text") {
          const newFile = createTextFile(auth, path, content)
          return newFile
        } else {
          return {
            message: "Only text messages are supported for now.",
          }
        }
      } catch (error) {
        if (error instanceof GaxiosError) {
          if (error.status === 401) {
            throw new TokenVaultError(`Authorization required to access the Federated Connection`)
          }
        }

        throw error
      }
    },
  })
)

async function createTextFile(auth: OAuth2Client, fileName: string, fileContent: string) {
  const drive = google.drive({ version: "v3", auth })

  const fileMetadata = {
    name: fileName, // The name of the file
    mimeType: "text/plain",
    // To place it in a specific folder, add:
    // parents: ['YOUR_FOLDER_ID_HERE']
  }

  // Create a readable stream from the content
  const buffer = Buffer.from(fileContent, "utf-8")
  const bufferStream = new stream.PassThrough()
  bufferStream.end(buffer)

  const media = {
    mimeType: "text/plain",
    body: bufferStream, // Use the stream here
  }

  try {
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name", // Specify which fields to return
    })

    return file.data
  } catch (err) {
    console.error("Error creating file:", err)
    throw err
  }
}
