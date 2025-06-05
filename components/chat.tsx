"use client"

import { useUser } from "@auth0/nextjs-auth0"

import { LogIn } from "lucide-react"

import type { UIMessage } from "ai"

import { useChat } from "@ai-sdk/react"
import { useInterruptions } from "@auth0/ai-vercel/react"

import Link from "next/link"
import UserButton from "@/components/auth0/user-button"
import Footer from "./footer"
import { Messages } from "./messages"
import { MultimodalInput } from "./multimodal-input"
import { Button } from "./ui/button"
import ThemeToggle from "./theme-toggle"

import { generateUUID } from "@/lib/utils"

export function Chat({
  id,
  initialMessages,
  isReadonly,
}: {
  id: string
  initialMessages: Array<UIMessage>
  isReadonly: boolean
}) {
  const { user } = useUser()

  const {
    messages,
    setMessages,
    append,
    status,
    reload,
    input,
    setInput,
    stop,
    handleSubmit,
    toolInterrupt,
  } = useInterruptions(handler =>
    useChat({
      id,
      body: { id },
      initialMessages,
      experimental_throttle: 100,
      sendExtraMessageFields: true,
      generateId: generateUUID,
      onError: handler(error => console.error("Chat error:", error)),
    })
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
                    <LogIn size={16} className="mr-2" />
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
            reload={reload}
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
              />
            )}
          </form>
          <Footer />
        </div>
      </div>
    </>
  )
}
