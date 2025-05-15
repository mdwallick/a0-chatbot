"use client"

import type { UIMessage, ChatRequestOptions } from "ai"
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useChat } from "@ai-sdk/react";
import { useInterruptions } from "@auth0/ai-vercel/react";
import { useUser } from "@auth0/nextjs-auth0";

import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";

export function Chat({
  id,
  initialMessages,
  isReadonly,
}: {
  id: string
  initialMessages: Array<UIMessage>
  isReadonly: boolean
}) {
  const router = useRouter()
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
      onFinish: async message => {
        // Save messages to database if user is authenticated
        if (user) {
          try {
            await fetch("/api/chat/save", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                threadId: id,
                message: {
                  content: message.content,
                  role: message.role,
                  attachments: message.experimental_attachments,
                },
              }),
            })
            // Refresh the router to update the sidebar
            router.refresh()
          } catch (error) {
            console.error("Error saving message:", error)
          }
        }
      },
    })
  )

  useEffect(() => {
    // Load chat thread messages when component mounts
    if (user && id) {
      fetch(`/api/chat/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages)
          }
        })
        .catch(error => {
          console.error("Error loading chat thread:", error)
        })
    }
  }, [id, user, setMessages])

  const handleSubmitWithSave = async (
    event?: { preventDefault?: () => void },
    chatRequestOptions?: ChatRequestOptions
  ) => {
    if (event?.preventDefault) {
      event.preventDefault()
    }

    const userMessage = {
      content: input,
      role: "user" as const,
    }

    // Save user message to database if authenticated
    if (user) {
      try {
        await fetch("/api/chat/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            threadId: id,
            message: userMessage,
          }),
        })
        // Refresh the router to update the sidebar
        router.refresh()
      } catch (error) {
        console.error("Error saving message:", error)
      }
    }

    // Continue with normal chat submission
    handleSubmit(event, chatRequestOptions)
  }

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
          onSubmit={handleSubmitWithSave}
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
              handleSubmit={handleSubmitWithSave}
            />
          )}
        </form>
      </div>
    </>
  )
}
