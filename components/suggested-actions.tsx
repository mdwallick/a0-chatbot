
"use client"

import { motion } from "framer-motion"
import { memo } from "react"

import { UseChatHelpers } from "@ai-sdk/react"

import { Button } from "./ui/button"

interface SuggestedActionsProps {
  chatId: string
  append: UseChatHelpers["append"]
}

function PureSuggestedActions({ chatId, append }: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: "Create an image",
      label: "using DALL-E",
      action: "Create an image of a cat using DALL-E",
      picture: "cartoon-cat.png",
    },
    {
      title: "Eat healthier",
      label: "meal planning tips",
      action: "Give me tips for eating healthier and meal planning",
      picture: "healthy-food.png",
    },
    {
      title: "Prep for an interview",
      label: "practice questions",
      action: "Help me prepare for a job interview with practice questions",
      picture: "cartoon-cat.png", // You can replace with appropriate images
    },
    {
      title: "Get a news roundup",
      label: "today's headlines",
      action: "Give me a summary of today's news headlines",
      picture: "cartoon-cat.png", // You can replace with appropriate images
    },
  ]

  return (
    <div data-testid="suggested-actions" className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mb-4">
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              window.history.replaceState({}, "", `/chat/${chatId}`)

              append({
                role: "user",
                content: suggestedAction.action,
              })
            }}
            className="relative h-24 w-full rounded-2xl p-4 text-left overflow-hidden border-none hover:scale-105 transition-transform duration-200"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(/${suggestedAction.picture})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="relative z-10 flex flex-col justify-end h-full text-white">
              <div className="font-medium text-sm leading-tight">{suggestedAction.title}</div>
              <div className="text-xs opacity-80 mt-1">{suggestedAction.label}</div>
            </div>
          </Button>
        </motion.div>
      ))}
    </div>
  )
}

export const SuggestedActions = memo(PureSuggestedActions, () => true)
