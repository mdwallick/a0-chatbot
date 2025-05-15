import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"
import { Client, ResponseType } from "@microsoft/microsoft-graph-client"

import { withOneDrive } from "../../../auth0-ai/windows-live"

import mammoth from "mammoth"
import * as XLSX from "xlsx"

import { extractPdfText } from "@/lib/utils" // adjust path as needed

const toolSchema = z.object({
  path: z
    .string()
    .describe(
      "Full path to the file in OneDrive (e.g. /example.pdf or /notes.txt or /report.docx or /data.xlsx)"
    ),
})

export const MicrosoftFilesReadTool = withOneDrive(
  tool({
    description: "Read the contents of a given file from OneDrive",
    parameters: toolSchema,
    execute: async ({ path }) => {
      // Get the access token from Auth0 AI
      const access_token = getAccessTokenForConnection()

      // One Drive SDK
      try {
        const client = Client.initWithMiddleware({
          authProvider: {
            getAccessToken: async () => {
              return access_token
            },
          },
        })

        // const items = await client.api("/me/drive/root/children").get()
        // return items
        const normalizedPath = path.startsWith("/") ? path : `/${path}`
        const metadata = await client.api(`/me/drive/root:${normalizedPath}`).get()

        const fileMime = metadata.file?.mimeType || ""
        const fileBuffer = await client
          .api(`/me/drive/items/${metadata.id}/content`)
          .responseType(ResponseType.ARRAYBUFFER)
          .get()

        const buffer = Buffer.from(fileBuffer)

        // PDF
        if (fileMime.includes("pdf")) {
          const text = await extractPdfText(buffer)
          return {
            text,
            metadata,
            fileMime,
          }
        }

        // Plain text
        if (fileMime.startsWith("text/")) {
          const text = buffer.toString("utf-8")
          return success(text, metadata, fileMime)
        }

        // Word document (.docx)
        if (fileMime.includes("wordprocessingml.document")) {
          const result = await mammoth.extractRawText({ buffer })
          return success(result.value, metadata, fileMime)
        }

        // Excel spreadsheet (.xlsx)
        if (fileMime.includes("spreadsheetml.sheet")) {
          const workbook = XLSX.read(buffer, { type: "buffer" })
          const allText = workbook.SheetNames.map(sheetName => {
            const sheet = workbook.Sheets[sheetName]
            return XLSX.utils.sheet_to_csv(sheet)
          }).join("\n\n")
          return success(allText, metadata, fileMime)
        }

        return error(`Unsupported file type: ${fileMime}`)
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

// Helper functions
function success(content: string, metadata: any, type: string) {
  return {
    content,
    metadata: {
      name: metadata.name,
      type,
      size: metadata.size,
    },
  }
}

function error(message: string) {
  return {
    status: "error",
    message,
  }
}
