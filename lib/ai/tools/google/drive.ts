import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"
import { Readable } from "stream"
import { google } from "googleapis"

import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel"
import { TokenVaultError } from "@auth0/ai/interrupts"

import { getGoogleAuth, withGoogleDriveRead } from "@/lib/auth0-ai/google"

const toolSchema = z.object({
  action: z
    .enum(["search", "read"])
    .describe("Action: 'search' to find files, 'read' to get content"),
  query: z
    .string()
    .optional()
    .nullable()
    .describe("Search query for finding files (required for search action)"),
  fileId: z.string().optional().nullable().describe("File ID to read (required for read action)"),
  limit: z
    .number()
    .optional()
    .default(10)
    .describe("Maximum number of files to return for search (default: 10)"),
})

export const GoogleDriveTool = withGoogleDriveRead(
  tool({
    description:
      "Search and read files from Google Drive. Use action 'search' to find files by query, or 'read' to get file content by ID.",
    inputSchema: toolSchema,
    execute: async ({ action, query, fileId, limit }) => {
      const logs: string[] = []

      try {
        // Get the access token from Auth0 AI
        const access_token = getAccessTokenFromTokenVault()
        logs.push("got access token from token vault")

        // Create Google OAuth client
        const auth = getGoogleAuth(access_token)
        const drive = google.drive({ version: "v3", auth })

        if (action === "search") {
          // Search for files
          const res = await drive.files.list({
            q: query || undefined,
            fields: "files(id, name, mimeType)",
            pageSize: limit,
          })

          const files = res.data.files || []
          logs.push(`Found ${files.length} files`)

          return {
            action: "search",
            logs,
            files: files.map(f => ({
              id: f.id,
              name: f.name,
              mimeType: f.mimeType,
            })),
          }
        } else if (action === "read") {
          if (!fileId) {
            return {
              action: "read",
              status: "error",
              message: "fileId is required for read action",
            }
          }

          // Get file metadata
          const metaRes = await drive.files.get({
            fileId: fileId,
            fields: "id, name, mimeType",
          })

          const fileInfo = metaRes.data
          let content: string | null = null

          // Get content based on MIME type
          if (
            fileInfo.mimeType === "application/vnd.google-apps.document" ||
            fileInfo.mimeType === "application/vnd.google-apps.spreadsheet" ||
            fileInfo.mimeType === "application/vnd.google-apps.presentation"
          ) {
            // Export Google Workspace files as plain text
            const exportRes = await drive.files.export(
              { fileId: fileId, mimeType: "text/plain" },
              { responseType: "stream" }
            )
            content = await streamToString(exportRes.data)
          } else if (fileInfo.mimeType && fileInfo.mimeType.startsWith("text/")) {
            // Download plain text files directly
            const downloadRes = await drive.files.get(
              { fileId: fileId, alt: "media" },
              { responseType: "stream" }
            )
            content = await streamToString(downloadRes.data)
          } else if (fileInfo.mimeType === "application/pdf") {
            const downloadRes = await drive.files.get(
              { fileId: fileId, alt: "media" },
              { responseType: "stream" }
            )
            const buffer = await streamToBuffer(downloadRes.data)
            content = `[PDF content for '${fileInfo.name}' needs parsing. Buffer length: ${buffer.length}]`
          } else if (
            fileInfo.mimeType ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          ) {
            const downloadRes = await drive.files.get(
              { fileId: fileId, alt: "media" },
              { responseType: "stream" }
            )
            const buffer = await streamToBuffer(downloadRes.data)
            content = `[DOCX content for '${fileInfo.name}' needs parsing. Buffer length: ${buffer.length}]`
          } else {
            console.info(
              `Cannot extract text from MIME type: ${fileInfo.mimeType}. Only metadata will be returned.`
            )
            content = `[Content not available for this file type: ${fileInfo.name}]`
          }

          logs.push(`Read file: ${fileInfo.name}`)

          return {
            action: "read",
            logs,
            id: fileInfo.id,
            name: fileInfo.name,
            mimeType: fileInfo.mimeType,
            content: content,
          }
        }

        return {
          status: "error",
          message: `Unknown action: ${action}`,
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

/**
 * Reads a Readable stream into a string.
 */
async function streamToString(stream: any): Promise<string> {
  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)))
    stream.on("error", (err: Error) => reject(err))
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")))
  })
}

/**
 * Reads a Readable stream into a Buffer.
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    stream.on("data", chunk => chunks.push(Buffer.from(chunk)))
    stream.on("error", err => reject(err))
    stream.on("end", () => resolve(Buffer.concat(chunks)))
  })
}
