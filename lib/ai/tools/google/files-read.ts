import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"
import { Readable } from "stream"
import { google } from "googleapis"

import { getGoogleAuth, withGoogleDriveRead } from "@/lib/auth0-ai/google"

const toolSchema = z.object({
  fileId: z.string().describe("The Google Drive file ID to read"),
})

export const GoogleFilesReadTool = withGoogleDriveRead(
  tool({
    description: "Read the contents of a given file from OneDrive",
    parameters: toolSchema,
    execute: async ({ fileId }) => {
      const logs = []

      // Get the access token from Auth0 AI
      const access_token = getAccessTokenForConnection()
      logs.push("got access token from token vault")

      const auth = getGoogleAuth(access_token)

      try {
        const drive = google.drive({ version: "v3", auth })

        // 1. Get Metadata (Name and MIME Type)
        const metaRes = await drive.files.get({
          fileId: fileId,
          fields: "id, name, mimeType",
        })

        const fileInfo = metaRes.data
        console.log(`Reading file: ${fileInfo.name} (Type: ${fileInfo.mimeType})`)

        let content = null

        // 2. Get Content based on MIME Type
        if (
          fileInfo.mimeType === "application/vnd.google-apps.document" ||
          fileInfo.mimeType === "application/vnd.google-apps.spreadsheet" ||
          fileInfo.mimeType === "application/vnd.google-apps.presentation"
        ) {
          // Export Google Workspace files as plain text
          console.log("Exporting as text/plain...")
          const exportRes = await drive.files.export(
            { fileId: fileId, mimeType: "text/plain" },
            { responseType: "stream" }
          )
          content = await streamToString(exportRes.data)
        } else if (fileInfo.mimeType && fileInfo.mimeType.startsWith("text/")) {
          // Download plain text files directly
          console.log("Downloading as text...")
          const downloadRes = await drive.files.get(
            { fileId: fileId, alt: "media" },
            { responseType: "stream" }
          )
          content = await streamToString(downloadRes.data)
        } else if (fileInfo.mimeType === "application/pdf") {
          console.log("Downloading PDF (requires parsing)...")
          const downloadRes = await drive.files.get(
            { fileId: fileId, alt: "media" },
            { responseType: "stream" }
          )
          const buffer = await streamToBuffer(downloadRes.data)
          // *** PARSING STEP (Requires external library) ***
          // try {
          //   const pdfData = await pdfParse(buffer);
          //   content = pdfData.text;
          //   console.log('PDF text extracted.');
          // } catch (parseErr) {
          //    console.error("Failed to parse PDF:", parseErr);
          //    content = `[Could not parse PDF: ${fileInfo.name}]`;
          // }
          content = `[PDF content for '${fileInfo.name}' needs parsing. Buffer length: ${buffer.length}]` // Placeholder
        } else if (
          fileInfo.mimeType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          console.log("Downloading DOCX (requires parsing)...")
          const downloadRes = await drive.files.get(
            { fileId: fileId, alt: "media" },
            { responseType: "stream" }
          )
          const buffer = await streamToBuffer(downloadRes.data)
          // *** PARSING STEP (Requires external library) ***
          // try {
          //   const docxData = await mammoth.extractRawText({ buffer: buffer });
          //   content = docxData.value;
          //   console.log('DOCX text extracted.');
          // } catch (parseErr) {
          //    console.error("Failed to parse DOCX:", parseErr);
          //    content = `[Could not parse DOCX: ${fileInfo.name}]`;
          // }
          content = `[DOCX content for '${fileInfo.name}' needs parsing. Buffer length: ${buffer.length}]` // Placeholder
        } else {
          console.log(
            `Cannot extract text from MIME type: ${fileInfo.mimeType}. Only metadata will be returned.`
          )
          content = `[Content not available for this file type: ${fileInfo.name}]`
        }

        // 3. Return results
        return {
          id: fileInfo.id,
          name: fileInfo.name,
          mimeType: fileInfo.mimeType,
          content: content, // This will be the text content, or a placeholder/error
        }
      } catch (error) {
        if (error instanceof GaxiosError) {
          if (error.status === 401) {
            throw new FederatedConnectionError(
              `Authorization required to access the Federated Connection`
            )
          }
        }

        throw error
      }
    },
  })
)

/**
 * Reads a Readable stream into a string.
 * @param {Readable} stream - The input stream.
 * @returns {Promise<string>} A promise that resolves with the stream content as a string.
 */
async function streamToString(stream: any) {
  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)))
    stream.on("error", (err: Error) => reject(err))
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")))
  })
}

/**
 * Reads a Readable stream into a Buffer.
 * @param {Readable} stream - The input stream.
 * @returns {Promise<Buffer>} A promise that resolves with the stream content as a Buffer.
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    stream.on("data", chunk => chunks.push(Buffer.from(chunk)))
    stream.on("error", err => reject(err))
    stream.on("end", () => resolve(Buffer.concat(chunks)))
  })
}
