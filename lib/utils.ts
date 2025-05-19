import { Attachment } from "ai"
import { ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { GoogleFile } from "@/components/google-picker"

import type { Message } from "ai"

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

export function trimMessages(
  messages: Message[],
  options: {
    keepSystem?: boolean
    maxMessages?: number
  } = {}
): Message[] {
  const { keepSystem = true, maxMessages = 10 } = options

  const systemMessages = keepSystem ? messages.filter(m => m.role === "system") : []

  const chatMessages = messages.filter(m => m.role === "user" || m.role === "assistant")

  const trimmedMessages = chatMessages.slice(-maxMessages)

  return [...systemMessages, ...trimmedMessages]
}
