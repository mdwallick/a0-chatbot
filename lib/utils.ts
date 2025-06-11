import { Attachment } from "ai"
import { ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { GoogleFile } from "@/components/google-picker"

import type { Message } from "ai"

import { startOfDay } from "date-fns"
import { prisma } from "@/lib/prisma"

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

export function getImageCreationLimit() {
  const raw = parseInt(process.env.IMAGES_PER_DAY_LIMIT ?? "", 10)
  return raw > 0 ? raw : 3
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

export async function incrementImageUsage(userId: string) {
  const today = startOfDay(new Date()) // ensures only YYYY-MM-DD is used
  const maxPerDay = getImageCreationLimit()

  const usage = await prisma.dailyUsage.upsert({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
    update: {
      count: {
        increment: 1,
      },
    },
    create: {
      userId,
      date: today,
      count: 1,
    },
  })

  if (usage.count > maxPerDay) {
    throw new Error(`You've reached your daily limit of ${maxPerDay} image generations.`)
  }
}

export async function getImageCountToday(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const usage = await prisma.dailyUsage.findFirst({
    where: {
      userId,
      date: { gte: today },
    },
  })
  return usage?.count
}
