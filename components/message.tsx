"use client"

import type { UIMessage } from "ai"
import cx from "classnames"
import equal from "fast-deep-equal"
import { AnimatePresence, motion } from "framer-motion"
import { memo, useState } from "react"

import { EnsureAPIAccessPopup } from "@/components/auth0-ai/FederatedConnections/popup"
import { AttachmentWithMeta, cn } from "@/lib/utils"
import { UseChatHelpers } from "@ai-sdk/react"
import { Auth0InterruptionUI } from "@auth0/ai-vercel/react"
import { FederatedConnectionInterrupt } from "@auth0/ai/interrupts"

import { AttachmentItem } from "./attachment-item"
import { AvailableConnections } from "./connections"
import { PencilEditIcon, SparklesIcon } from "./icons"
import { Markdown } from "./markdown"
import { MessageActions } from "./message-actions"
import { MessageEditor } from "./message-editor"
import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

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
  setMessages: UseChatHelpers["setMessages"]
  reload: UseChatHelpers["reload"]
  isReadonly: boolean
  toolInterrupt: Auth0InterruptionUI | null
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view")

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
        data-role={message.role}
      >
        {message.experimental_attachments && message.experimental_attachments.length > 0 && (
          <div className="flex gap-2 flex-row-reverse mb-3">
            {message.experimental_attachments
              ?.filter(attachment => attachment.contentType!.startsWith("text/"))
              .map(attachment => {
                const metadata = (attachment as AttachmentWithMeta).metadata

                return <AttachmentItem key={metadata.id} file={metadata} readOnly={true} />
              })}
          </div>
        )}

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
                  className={cn("flex flex-col gap-4", {
                    "bg-primary text-primary-foreground px-3 py-2 rounded-xl":
                      message.role === "user",
                  })}
                >
                  <Markdown>{message.content}</Markdown>
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
              FederatedConnectionInterrupt.isInterrupt(toolInterrupt) && (
                <EnsureAPIAccessPopup
                  interrupt={toolInterrupt}
                  connectWidget={{
                    title: getMetadata(toolInterrupt)!.title!,
                    description: getMetadata(toolInterrupt)!.shortDescription!,
                    action: { label: "Grant Access" },
                  }}
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
      className="w-full mx-auto max-w-3xl px-4 group/message "
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cx(
          "flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl",
          {
            "group-data-[role=user]/message:bg-muted": true,
          }
        )}
      >
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">Hmm...</div>
        </div>
      </div>
    </motion.div>
  )
}
