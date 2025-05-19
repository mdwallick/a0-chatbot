import { tool } from "ai"
import { GaxiosError } from "gaxios"
import { z } from "zod"

import { getAccessTokenForConnection } from "@auth0/ai-vercel"
import { FederatedConnectionError } from "@auth0/ai/interrupts"
import { Client } from "@microsoft/microsoft-graph-client"

import { withOneDrive } from "../../../auth0-ai/windows-live"

import { Document, Packer, Paragraph, TextRun } from "docx"
import * as XLSX from "xlsx"

const writeSchema = z.object({
  path: z.string().describe("Full path to the file in OneDrive (e.g. /Documents/example.docx)"),
  content: z.string().describe("Content to write to the file"),
  type: z.enum(["text", "docx", "xlsx"]).describe("Type of file to create"),
})

export const MicrosoftFilesWriteTool = withOneDrive(
  tool({
    description: "Create and edit files in OneDrive",
    parameters: writeSchema,
    execute: async ({ path, content, type }) => {
      try {
        const access_token = getAccessTokenForConnection()

        const client = Client.initWithMiddleware({
          authProvider: {
            getAccessToken: async () => {
              return access_token
            },
          },
        })

        if (type === "text") {
          await client.api(`/me/drive/root:${path}:/content`).put(content)
          return JSON.stringify({
            status: "success",
            message: `Text file at ${path} was successfully created/updated`,
          })
        }

        let templateType = ""
        if (type === "docx") {
          templateType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        } else if (type === "xlsx") {
          templateType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }

        if (type === "docx") {
          const doc = new Document({
            sections: [
              {
                children: content
                  .split("\n")
                  .map(line => new Paragraph({ children: [new TextRun(line)] })),
              },
            ],
          })

          const buffer = await Packer.toBuffer(doc)

          const newFile = await client
            .api(`/me/drive/root:${path}:/content`)
            .header("Content-Type", templateType)
            .put(buffer)

          return newFile
        } else if (type === "xlsx") {
          const rows = content.split("\n").map(row => row.split(","))

          const wb = XLSX.utils.book_new()
          const ws = XLSX.utils.aoa_to_sheet(rows)
          XLSX.utils.book_append_sheet(wb, ws, "Sheet1")

          const excelBuffer = XLSX.write(wb, {
            type: "buffer",
            bookType: "xlsx",
          })

          const newFile = await client
            .api(`/me/drive/root:${path}:/content`)
            .header("Content-Type", templateType)
            .put(excelBuffer)

          return JSON.stringify({
            status: "success",
            message: `Excel document at ${path} was successfully created/updated`,
            fileId: newFile.id,
          })
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
