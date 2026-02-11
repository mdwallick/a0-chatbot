"use client"

import type { UIMessage } from "ai"
import equal from "fast-deep-equal"
import { AnimatePresence, motion } from "framer-motion"
import { memo, useState } from "react"

import { EnsureAPIAccessPopup } from "@/components/auth0-ai/FederatedConnections/popup"
import { cn, getMessageText } from "@/lib/utils"
import { Auth0InterruptionUI } from "@auth0/ai-vercel/react"
import { TokenVaultInterrupt } from "@auth0/ai/interrupts"

import { AvailableConnections } from "./connections"
import { PencilEditIcon, SparklesIcon, LoaderIcon } from "./icons"
import { Markdown } from "./markdown"
import { MessageActions } from "./message-actions"
import { MessageEditor } from "./message-editor"
import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

// Helper to get tool invocation parts from a message
function getToolParts(message: UIMessage) {
  return message.parts.filter(
    (part): part is Extract<typeof part, { type: string; toolCallId: string }> =>
      typeof part === "object" && "type" in part && part.type.startsWith("tool-")
  )
}

// Get tool parts that should be displayed (loading or recently completed)
function getVisibleToolParts(message: UIMessage) {
  return getToolParts(message).filter(
    part =>
      part.state === "input-streaming" ||
      part.state === "input-available" ||
      part.state === "output-available" ||
      part.state === "output-error"
  )
}

// Component to render tool status with visual feedback
function ToolInvocationDisplay({ part, isLastMessage }: { part: any; isLastMessage: boolean }) {
  const state = part.state
  const toolName = part.toolName || part.type?.replace("tool-", "") || "Tool"

  // Show loading indicator while tool is being called
  if (state === "input-streaming" || state === "input-available") {
    return (
      <div className="flex items-center gap-2 text-sm py-2 px-3 bg-muted/50 rounded-md border border-muted">
        <LoaderIcon size={14} />
        <span className="text-muted-foreground animate-pulse">
          Accessing {formatToolName(toolName)}...
        </span>
      </div>
    )
  }

  // Show success state briefly (only on latest message during streaming)
  if (state === "output-available" && isLastMessage) {
    return (
      <div className="flex items-center gap-2 text-sm py-2 px-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
        <span className="text-green-600 dark:text-green-400">
          ✓ {formatToolName(toolName)} complete
        </span>
      </div>
    )
  }

  // Show error state if tool failed
  if (state === "output-error") {
    return (
      <div className="flex items-center gap-2 text-sm py-2 px-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
        <span className="text-red-600 dark:text-red-400">✗ {formatToolName(toolName)} failed</span>
      </div>
    )
  }

  // Don't display tool results - let the LLM interpret and respond
  return null
}

// Format tool name for display
function formatToolName(toolName: string): string {
  return toolName
    .replace(/Tool$/, "")
    .replace(/([A-Z])/g, " $1")
    .trim()
}

const PurePreviewMessage = ({
  chatId,
  message,
  isLoading,
  isReadonly,
  setMessages,
  reload,
  toolInterrupt,
}: {
  chatId: string
  message: UIMessage
  isLoading: boolean
  setMessages: (messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[])) => void
  reload: () => void
  isReadonly: boolean
  toolInterrupt: Auth0InterruptionUI | null
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view")

  // Check if this message is being streamed
  const messageText = getMessageText(message)
  const isStreaming = isLoading && message.role === "assistant"

  function getMetadata(toolInterrupt: Auth0InterruptionUI) {
    const metadata = AvailableConnections.find(
      (account: any) => account.connection === toolInterrupt?.connection
    )

    return metadata
  }

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            {
              "w-full": mode === "edit",
              "group-data-[role=user]/message:w-fit": mode !== "edit",
            }
          )}
        >
          {message.role === "assistant" && (
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 w-full">
            {mode === "view" && (
              <div className="flex flex-row gap-2 items-start">
                {message.role === "user" && !isReadonly && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        data-testid="message-edit-button"
                        variant="ghost"
                        className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                        onClick={() => {
                          setMode("edit")
                        }}
                      >
                        <PencilEditIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit message</TooltipContent>
                  </Tooltip>
                )}
                <div
                  data-testid="message-content"
                  className={cn("flex flex-col gap-2", {
                    "bg-primary text-primary-foreground px-3 py-2 rounded-xl":
                      message.role === "user",
                  })}
                >
                  {/* Show tool execution status */}
                  {message.role === "assistant" &&
                    getVisibleToolParts(message).map((part, index) => (
                      <ToolInvocationDisplay
                        key={part.toolCallId || index}
                        part={part}
                        isLastMessage={isLoading}
                      />
                    ))}
                  {/* Show text content */}
                  {messageText && (
                    <div className="relative">
                      <Markdown>{messageText}</Markdown>
                    </div>
                  )}
                  {/* Show streaming indicator when generating */}
                  {isStreaming && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {mode === "edit" && (
              <div className="flex flex-row gap-2 items-start">
                <div className="size-8" />

                <MessageEditor
                  key={message.id}
                  message={message}
                  setMode={setMode}
                  setMessages={setMessages}
                  reload={reload}
                />
              </div>
            )}

            {message.role === "assistant" &&
              toolInterrupt &&
              TokenVaultInterrupt.isInterrupt(toolInterrupt) && (
                <EnsureAPIAccessPopup
                  interrupt={toolInterrupt}
                  connectWidget={{
                    title: getMetadata(toolInterrupt)!.title!,
                    description: getMetadata(toolInterrupt)!.shortDescription!,
                    action: { label: "Grant Access" },
                  }}
                  regenerate={reload}
                />
              )}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export const PreviewMessage = memo(PurePreviewMessage, (prevProps, nextProps) => {
  // Always re-render during streaming to show text updates
  if (nextProps.isLoading) return false
  if (prevProps.isLoading !== nextProps.isLoading) return false
  if (prevProps.message.id !== nextProps.message.id) return false
  if (!equal(prevProps.message.parts, nextProps.message.parts)) return false

  return true
})

export const ThinkingMessage = () => {
  const role = "assistant"

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      data-role={role}
    >
      <div className="flex gap-4 w-full rounded-xl">
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
          <div className="translate-y-px">
            <SparklesIcon size={14} />
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-2 text-muted-foreground">
            <LoaderIcon size={16} />
            <span className="animate-pulse">Thinking...</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
