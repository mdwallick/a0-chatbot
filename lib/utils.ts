import { Attachment } from "ai"
import { ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { GoogleFile } from "@/components/google-picker"

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf"
import worker from "pdfjs-dist/legacy/build/pdf.worker.entry"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export interface AttachmentWithMeta extends Attachment {
  metadata: GoogleFile
}

// Register the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = worker

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
  const pdf = await loadingTask.promise

  const pageTexts = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf
        .getPage(i + 1)
        .then(page =>
          page
            .getTextContent()
            .then(textContent => textContent.items.map((item: any) => item.str).join(" "))
        )
    )
  )

  return pageTexts.join("\n\n")
}
