import { tool } from "ai"
import { z } from "zod"
import mammoth from "mammoth"
import * as XLSX from "xlsx"

import { getAccessTokenFromTokenVault } from "@auth0/ai-vercel"
import { TokenVaultError } from "@auth0/ai/interrupts"
import { Client, ResponseType } from "@microsoft/microsoft-graph-client"

import { withMSOneDriveRead } from "@/lib/auth0-ai/microsoft"

const toolSchema = z.object({
  action: z
    .enum(["list", "read"])
    .describe("Action: 'list' to browse files in a folder, 'read' to get file content"),
  path: z
    .string()
    .optional()
    .nullable()
    .describe("Folder path for list action (e.g., /Documents). Leave blank for root."),
  fileId: z.string().optional().nullable().describe("File ID for read action"),
})

export const MicrosoftOneDriveTool = withMSOneDriveRead(
  tool({
    description:
      "Browse and read files from OneDrive. Use action 'list' to see files in a folder, or 'read' to get file content by ID.",
    inputSchema: toolSchema,
    execute: async ({ action, path, fileId }) => {
      const logs: string[] = []

      try {
        // Get the access token from Auth0 AI
        const access_token = getAccessTokenFromTokenVault()
        logs.push("got access token from token vault")

        if (!access_token) {
          logs.push("access token missing or expired")
          throw new TokenVaultError("Authorization required to access OneDrive")
        }

        // Initialize OneDrive client
        const client = Client.initWithMiddleware({
          authProvider: {
            getAccessToken: async () => {
              return access_token
            },
          },
        })

        if (action === "list") {
          // List files in folder
          const drivePath = path ? `/me/drive/root:/${path}:/children` : `/me/drive/root/children`
          logs.push(`Fetching items from path: ${drivePath}`)

          const items = await client.api(drivePath).get()

          if (!items) {
            logs.push("No items returned from OneDrive")
            return {
              action: "list",
              status: "error",
              message: "No items returned from OneDrive",
            }
          }

          logs.push(`Found ${items.value?.length || 0} items`)

          return {
            action: "list",
            logs,
            files: (items.value || []).map((item: any) => ({
              id: item.id,
              name: item.name,
              mimeType: item.file?.mimeType || (item.folder ? "folder" : "unknown"),
              size: item.size,
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
            content = `[PDF content for '${metadata.name}' needs parsing. Buffer length: ${buffer.length}]`
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
              action: "read",
              status: "error",
              message: `Unsupported file type: ${fileMime}`,
            }
          }

          logs.push(`Read file: ${metadata.name}`)

          return {
            action: "read",
            logs,
            content,
            metadata: {
              id: metadata.id,
              name: metadata.name,
              mimeType: fileMime,
              size: metadata.size,
            },
          }
        }

        return {
          status: "error",
          message: `Unknown action: ${action}`,
        }
      } catch (error: any) {
        console.error("[ERROR] OneDrive operation failed:", {
          error,
          errorType: error?.constructor?.name,
          errorMessage: error?.message,
          errorResponse: error?.response?.data,
          errorStatus: error?.response?.status,
        })

        if (error instanceof TokenVaultError) {
          console.error("[ERROR] Federation connection error:", error.message)
          throw error
        }

        if (error?.response?.status === 401 || error?.response?.status === 403) {
          console.error("[ERROR] Authentication error:", error.response.status)
          throw new TokenVaultError("Authorization required to access OneDrive")
        }

        throw new Error(
          `OneDrive operation failed: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    },
  })
)
