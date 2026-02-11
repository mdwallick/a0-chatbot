import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel"
import { TokenVaultError } from "@auth0/ai/interrupts"
import { google } from "googleapis"
import stream from "stream"

import { getGoogleAuth, withGoogleDriveWrite } from "@/lib/auth0-ai/google"
import { OAuth2Client } from "google-auth-library"

const writeSchema = z.object({
  fileName: z
    .string()
    .describe("The name of the file to create (e.g., 'My Document', 'Report.txt')"),
  content: z
    .string()
    .describe("Content to write to the file. For Google Docs, this will be the initial text."),
  fileType: z
    .enum(["text", "doc", "sheet"])
    .describe(
      "Type of file: 'text' for plain text, 'doc' for Google Docs, 'sheet' for Google Sheets"
    ),
  parentFolderId: z
    .string()
    .optional()
    .nullable()
    .describe("The ID of the parent folder. Use 'root' for My Drive top level (default)."),
})

export const GoogleFilesWriteTool = withGoogleDriveWrite(
  tool({
    description:
      "Create files in Google Drive. Supports plain text files, Google Docs, and Google Sheets.",
    inputSchema: writeSchema,
    execute: async ({ fileName, content, fileType, parentFolderId }) => {
      const logs: string[] = []

      try {
        const access_token = getAccessTokenFromTokenVault()
        logs.push("Got access token from token vault")

        const auth = getGoogleAuth(access_token)
        const effectiveParentId = parentFolderId || "root"
        logs.push(`Parent folder: ${effectiveParentId}`)

        let result

        switch (fileType) {
          case "text":
            result = await createTextFile(auth, fileName, content, effectiveParentId, logs)
            break
          case "doc":
            result = await createGoogleDoc(auth, fileName, content, effectiveParentId, logs)
            break
          case "sheet":
            result = await createGoogleSheet(auth, fileName, effectiveParentId, logs)
            break
          default:
            return {
              error: `Unsupported file type: ${fileType}`,
              logs,
            }
        }

        logs.push(`Successfully created ${fileType} file: ${result.name} (ID: ${result.id})`)

        return {
          logs,
          file: result,
        }
      } catch (error) {
        if (error instanceof GaxiosError) {
          if (error.status === 401) {
            throw new TokenVaultError(`Authorization required to access the Federated Connection`)
          }
          logs.push(`API Error: ${error.status} - ${error.message}`)
        }
        console.error("Error creating file:", error)
        throw error
      }
    },
  })
)

async function createTextFile(
  auth: OAuth2Client,
  fileName: string,
  fileContent: string,
  parentFolderId: string,
  logs: string[]
) {
  const drive = google.drive({ version: "v3", auth })

  logs.push(`Creating text file: ${fileName}`)

  const fileMetadata = {
    name: fileName,
    mimeType: "text/plain",
    parents: [parentFolderId],
  }

  const buffer = Buffer.from(fileContent, "utf-8")
  const bufferStream = new stream.PassThrough()
  bufferStream.end(buffer)

  const media = {
    mimeType: "text/plain",
    body: bufferStream,
  }

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id, name, mimeType, webViewLink",
  })

  return file.data
}

async function createGoogleDoc(
  auth: OAuth2Client,
  fileName: string,
  content: string,
  parentFolderId: string,
  logs: string[]
) {
  const drive = google.drive({ version: "v3", auth })
  const docs = google.docs({ version: "v1", auth })

  logs.push(`Creating Google Doc: ${fileName}`)

  // Create an empty Google Doc
  const fileMetadata = {
    name: fileName,
    mimeType: "application/vnd.google-apps.document",
    parents: [parentFolderId],
  }

  const file = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id, name, mimeType, webViewLink",
  })

  // If content is provided, insert it into the document
  if (content && file.data.id) {
    logs.push("Inserting content into document")
    await docs.documents.batchUpdate({
      documentId: file.data.id,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      },
    })
  }

  return file.data
}

async function createGoogleSheet(
  auth: OAuth2Client,
  fileName: string,
  parentFolderId: string,
  logs: string[]
) {
  const drive = google.drive({ version: "v3", auth })

  logs.push(`Creating Google Sheet: ${fileName}`)

  const fileMetadata = {
    name: fileName,
    mimeType: "application/vnd.google-apps.spreadsheet",
    parents: [parentFolderId],
  }

  const file = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id, name, mimeType, webViewLink",
  })

  return file.data
}
