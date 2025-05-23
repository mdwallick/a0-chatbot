"use client"

import type { UIMessage } from "ai"

import { useChat } from "@ai-sdk/react"
import { useInterruptions } from "@auth0/ai-vercel/react"

import { Messages } from "./messages"
import { MultimodalInput } from "./multimodal-input"

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
      <div
        className="flex flex-col min-w-0 h-dvh bg-background w-full"
        style={{ maxHeight: "calc(100vh - 56px)" }}
      >
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
      </div>
    </>
  )
}
