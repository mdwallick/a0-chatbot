import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"
import mammoth from "mammoth"
import * as XLSX from "xlsx"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"
import { Client, ResponseType } from "@microsoft/microsoft-graph-client"

import { withMSOneDriveRead } from "@/lib/auth0-ai/microsoft"

const toolSchema = z.object({
  fileId: z.string().describe("The OneDrive file ID to read"),
})

export const MicrosoftFilesReadTool = withMSOneDriveRead(
  tool({
    description: "Read the contents of a given file from OneDrive",
    parameters: toolSchema,
    execute: async ({ fileId }) => {
      const logs = []

      // Get the access token from Auth0 AI
      const access_token = getAccessTokenForConnection()
      logs.push("got access token from token vault")

      if (!access_token) {
        logs.push("access token missing or expired")
        throw new FederatedConnectionError("Authorization required to access OneDrive")
      }

      // One Drive SDK
      try {
        const client = Client.initWithMiddleware({
          authProvider: {
            getAccessToken: async () => {
              return access_token
            },
          },
        })

        logs.push("getting file metadata")
        const metadata = await client.api(`/me/drive/items/${fileId}`).get()
        const fileMime = metadata.file?.mimeType || ""
        logs.push(`file type is ${fileMime}`)

        const fileBuffer = await client
          .api(`/me/drive/items/${fileId}/content`)
          .responseType(ResponseType.ARRAYBUFFER)
          .get()

        const buffer = Buffer.from(fileBuffer)
        let content = ""

        // PDF
        if (fileMime.includes("pdf")) {
          logs.push("PDF parsing is not implemented yet")
          throw new Error("PDF parsing not yet implemented")
        } else if (fileMime.startsWith("text/")) {
          // Plain text
          content = buffer.toString("utf-8")
        } else if (fileMime.includes("wordprocessingml.document")) {
          // Word document (.docx)
          const result = await mammoth.extractRawText({ buffer })
          content = result.value
        } else if (fileMime.includes("spreadsheetml.sheet")) {
          // Excel spreadsheet (.xlsx)
          const workbook = XLSX.read(buffer, { type: "buffer" })
          const allText = workbook.SheetNames.map(sheetName => {
            const sheet = workbook.Sheets[sheetName]
            return XLSX.utils.sheet_to_csv(sheet)
          }).join("\n\n")
          content = allText
        } else {
          return {
            status: "error",
            message: `Unsupported file type: ${fileMime}`,
          }
        }

        return {
          content,
          logs,
          metadata: {
            name: metadata.name,
            type: fileMime,
            size: metadata.size,
          },
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
