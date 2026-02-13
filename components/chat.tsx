"use client"

import { useUser } from "@auth0/nextjs-auth0"

import { User } from "lucide-react"

import type { UIMessage, FileUIPart } from "ai"
import { DefaultChatTransport, generateId } from "ai"

import { useChat } from "@ai-sdk/react"
import { useInterruptions } from "@auth0/ai-vercel/react"
import { toast } from "sonner"

import Link from "next/link"
import UserButton from "@/components/auth0/user-button"
import Footer from "./footer"
import { Messages } from "./messages"
import { MultimodalInput } from "./multimodal-input"
import { Button } from "./ui/button"
import ThemeToggle from "./theme-toggle"

import { useState, useCallback } from "react"

import type { ProviderName } from "@/lib/config/enabled-connections"

export function Chat({
  id,
  initialMessages,
  isReadonly,
  enabledProviders,
}: {
  id: string
  initialMessages: Array<UIMessage>
  isReadonly: boolean
  enabledProviders: ProviderName[]
}) {
  const { user } = useUser()

  // Local state for input
  const [input, setInput] = useState("")

  // Use useInterruptions to wrap useChat directly (Auth0 recommended pattern)
  const { messages, setMessages, sendMessage, status, regenerate, stop, toolInterrupt } =
    useInterruptions(handler =>
      useChat({
        id,
        messages: initialMessages,
        transport: new DefaultChatTransport({
          api: "/api/chat",
          body: { id },
        }),
        experimental_throttle: 30,
        generateId,
        onError: handler(error => {
          console.error("Chat error:", error)
          toast.error("Something went wrong. Please try again.")
        }),
      })
    )

  // Create handleSubmit wrapper
  const handleSubmit = useCallback(
    (e?: React.FormEvent, options?: { experimental_attachments?: FileUIPart[] }) => {
      e?.preventDefault()
      if (!input.trim()) return
      sendMessage({
        text: input,
        files: options?.experimental_attachments,
      })
      setInput("")
    },
    [input, sendMessage]
  )

  // Create append wrapper that uses sendMessage
  const append = useCallback(
    (message: { role: "user"; content: string }) => {
      return sendMessage({ text: message.content })
    },
    [sendMessage]
  )

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background w-full">
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-background">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-2">{/* Left side content can go here */}</div>
            <div className="flex items-center gap-2">
              {/* Right side content goes here */}
              {user ? (
                <UserButton user={user}>
                  <a href="/profile" className="flex gap-2 items-center text-sm w-full">
                    Profile
                  </a>
                  <ThemeToggle />
                </UserButton>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/auth/login">
                    <User size={16} className="mr-2" />
                    Sign In
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex flex-col flex-1 min-h-0">
          <Messages
            chatId={id}
            messages={messages}
            setMessages={setMessages}
            status={status}
            reload={regenerate}
            isReadonly={isReadonly}
            toolInterrupt={toolInterrupt}
          />

          <form
            onSubmit={handleSubmit}
            className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl"
          >
            {!isReadonly && (
              <MultimodalInput
                chatId={id}
                input={input}
                setInput={setInput}
                status={status}
                stop={stop}
                append={append}
                messages={messages}
                setMessages={setMessages}
                handleSubmit={handleSubmit}
                enabledProviders={enabledProviders}
              />
            )}
          </form>
          <Footer />
        </div>
      </div>
    </>
  )
}
