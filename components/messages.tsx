import type { UIMessage } from "ai"
import equal from "fast-deep-equal"
import { memo } from "react"
import { AnimatePresence } from "framer-motion"

import { Auth0InterruptionUI } from "@auth0/ai-vercel/react"

import { Greeting } from "./greeting"
import { PreviewMessage, ThinkingMessage } from "./message"
import { useScrollToBottom } from "./use-scroll-to-bottom"

import type { ChatStatus } from "ai"

interface MessagesProps {
  chatId: string
  status: ChatStatus
  messages: Array<UIMessage>
  setMessages: (messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[])) => void
  reload: () => void
  isReadonly: boolean
  toolInterrupt: Auth0InterruptionUI | null
}

function PureMessages({
  chatId,
  status,
  messages,
  setMessages,
  reload,
  isReadonly,
  toolInterrupt,
}: MessagesProps) {
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>()

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4"
    >
      {messages.length === 0 && status === "ready" && <Greeting />}

      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          chatId={chatId}
          message={message}
          isLoading={status === "streaming" && messages.length - 1 === index}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          toolInterrupt={toolInterrupt}
        />
      ))}

      <AnimatePresence>{status === "submitted" && <ThinkingMessage />}</AnimatePresence>

      <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]" />
    </div>
  )
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  // Always re-render during streaming to show text updates
  if (nextProps.status === "streaming") return false
  if (prevProps.status !== nextProps.status) return false
  if (prevProps.messages.length !== nextProps.messages.length) return false
  if (!equal(prevProps.messages, nextProps.messages)) return false

  return true
})
