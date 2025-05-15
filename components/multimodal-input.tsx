"use client"

import type { UIMessage } from "ai"
import cx from "classnames";
import { Plus } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocalStorage } from "usehooks-ts";

import { Connections } from "@/lib/auth0-ai/connections";
import { Attachment } from "@ai-sdk/ui-utils";
import { useUser } from "@auth0/nextjs-auth0";

import { AttachmentWithMeta } from "../lib/utils";
import { AttachmentItem } from "./attachment-item";
import { EnableIntegration } from "./enable-integration";
import { GoogleDrivePicker, GoogleFile } from "./google-picker";
import {
  ArrowUpIcon,
  BoxIcon,
  GoogleDriveIcon,
  GoogleDriveRoundedIcon,
  OneDriveIcon,
  OneDriveIconRounded,
  SalesforceIcon,
  SalesforceIconRounded,
  SlackIcon,
  SlackIconRounded,
  StopIcon,
} from "./icons";
import { IntegrationTools } from "./integration-tools";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Textarea } from "./ui/textarea";
import { useLinkedAccounts } from "./use-linked-accounts-context";

import type React from "react"
import type { UseChatHelpers } from "@ai-sdk/react"

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  messages,
  setMessages,
  handleSubmit,
  append,
  className,
}: {
  chatId: string
  input: UseChatHelpers["input"]
  setInput: UseChatHelpers["setInput"]
  status: UseChatHelpers["status"]
  stop: () => void
  messages: Array<UIMessage>
  setMessages: UseChatHelpers["setMessages"]
  handleSubmit: UseChatHelpers["handleSubmit"]
  append: UseChatHelpers["append"]
  className?: string
}) {
  const { user } = useUser()
  const linkedAccounts: any = useLinkedAccounts()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [files, setFiles] = useState<GoogleFile[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])

  function isConnectionEnabled(connection: string) {
    return linkedAccounts.some((account: any) => account.connection === connection)
  }

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight()
    }
  }, [])

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`
    }
  }

  const [localStorageInput, setLocalStorageInput] = useLocalStorage("input", "")

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || ""
      setInput(finalValue)
      adjustHeight()
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setLocalStorageInput(input)
  }, [input, setLocalStorageInput])

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
    adjustHeight()
  }

  const submitForm = useCallback(() => {
    window.history.replaceState({}, "", `/chat/${chatId}`)
    handleSubmit(undefined, {
      experimental_attachments: attachments,
    })
    setFiles([])
    setAttachments([])
    setLocalStorageInput("")
  }, [attachments, chatId, handleSubmit, setLocalStorageInput])

  const loadGoogleDocument = (file: GoogleFile) => {
    setFiles(prev => [...prev, file])
  }

  const onDidLoad = (file: GoogleFile) => {
    setAttachments(prev => {
      const exists = prev.some(att => (att as AttachmentWithMeta).metadata.id === file.id)

      if (exists) return prev

      const attachment = {
        name: file.name,
        contentType: "text/plain",
        url: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(file.content!)))}`,
        metadata: {
          id: file.id,
          name: file.name,
          iconUrl: file.iconUrl,
          type: "Google Docs",
        },
      }

      return [...prev, attachment]
    })
  }

  const handleRemoveAttachment = (file: GoogleFile) => {
    setFiles(prev => prev.filter(attachment => attachment.id !== file.id))
    setAttachments(prev => prev.filter(attachment => attachment.name !== file.name))
  }

  return (
    <div className="relative w-full flex flex-col gap-4 pointer-events-auto">
      {/* {messages.length === 0 && <SuggestedActions append={append} chatId={chatId} />} */}

      <div className="border-input rounded-2xl border p-3 shadow-lg transition-[color,box-shadow] outline-none flex flex-col gap-3 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
        {files.length > 0 && (
          <div className="flex flex-row gap-2">
            {files.map((attachment: GoogleFile) => (
              <AttachmentItem
                key={attachment.id}
                file={attachment}
                onDidLoad={onDidLoad}
                onRemove={handleRemoveAttachment}
              />
            ))}
          </div>
        )}

        <Textarea
          data-testid="multimodal-input"
          ref={textareaRef}
          placeholder="Ask anything"
          value={input}
          onChange={handleInput}
          className={cx(
            "min-h-[100px] overflow-hidden resize-none rounded-2xl !text-base bg-white pb-10 dark:border-zinc-700",
            className
          )}
          rows={2}
          autoFocus
          onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()

              if (status !== "ready") {
                toast.error("Please wait for the model to finish its response!")
              } else {
                submitForm()
              }
            }
          }}
        />
      </div>

      <div className="absolute bottom-0 p-3 w-fit flex flex-row justify-start gap-2 items-center">
        {user && (
          <>
            <Popover>
              <PopoverTrigger className="rounded-full border border-gray-300 p-1 hover:border-ring hover:ring-ring/50 hover:ring-[3px] transition-all ease-in cursor-pointer">
                <div>
                  <Plus color="#5D5D5D" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[275px] flex flex-col gap-0 p-0">
                {isConnectionEnabled(Connections.googleDrive.connection) ? (
                  <div className="flex items-center justify-between gap-2 hover:bg-gray-100 transition-all ease-in hover:cursor-pointer p-4 py-3 pt-3">
                    <div className="flex gap-2 items-center">
                      <GoogleDriveIcon />
                      <span className="text-sm text-gray-600">
                        <GoogleDrivePicker onSelect={loadGoogleDocument} />
                      </span>
                    </div>
                  </div>
                ) : (
                  <EnableIntegration
                    title="Connect to Google Drive"
                    icon={<GoogleDriveIcon />}
                    integration={Connections.googleDrive.connection}
                  />
                )}

                <EnableIntegration
                  title="Connect to One Drive"
                  icon={<OneDriveIcon />}
                  integration={Connections.windowsLive.connection}
                />

                <EnableIntegration
                  title="Connect to Salesforce"
                  icon={<SalesforceIcon />}
                  integration={Connections.salesforce.connection}
                />

                <EnableIntegration
                  title="Connect to Slack"
                  icon={<SlackIcon />}
                  integration={Connections.slack.connection}
                />

                <EnableIntegration
                  title="Connect to Box"
                  icon={<BoxIcon />}
                  integration={Connections.box.connection}
                />
              </PopoverContent>
            </Popover>

            {isConnectionEnabled(Connections.googleDrive.connection) && (
              <IntegrationTools
                append={append}
                title="Google Drive Tools"
                icon={<GoogleDriveRoundedIcon />}
                tools={[
                  {
                    title: "List files and folders",
                    prompt: "List files and folders from Google Drive",
                  },
                  {
                    title: "Get file metadata",
                    prompt: "Get file metadata",
                  },
                  {
                    title: "Export files",
                    prompt: "Export files",
                  },
                  {
                    title: "Create new folder",
                    prompt: "Create new folder",
                  },
                ]}
              />
            )}

            {isConnectionEnabled(Connections.windowsLive.connection) && (
              <IntegrationTools
                append={append}
                title="One Drive Tools"
                icon={<OneDriveIconRounded />}
                tools={[
                  {
                    title: "List files",
                    prompt: "List files from One Drive",
                  },
                ]}
              />
            )}

            {isConnectionEnabled(Connections.salesforce.connection) && (
              <IntegrationTools
                append={append}
                title="Salesforcde Tools"
                icon={<SalesforceIconRounded />}
                tools={[
                  {
                    title: "Search CRM",
                    prompt: "Search records from Salesforce",
                  },
                ]}
              />
            )}

            {isConnectionEnabled(Connections.slack.connection) && (
              <IntegrationTools
                append={append}
                title="Slack Tools"
                icon={<SlackIconRounded />}
                tools={[
                  {
                    title: "List channels",
                    prompt: "List channels",
                  },
                ]}
              />
            )}
          </>
        )}
      </div>
      <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
        {status === "submitted" ? (
          <StopButton stop={stop} setMessages={setMessages} />
        ) : (
          <SendButton input={input} submitForm={submitForm} />
        )}
      </div>
    </div>
  )
}

export const MultimodalInput = memo(PureMultimodalInput, (prevProps, nextProps) => {
  if (prevProps.input !== nextProps.input) return false
  if (prevProps.status !== nextProps.status) return false

  return true
})

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void
  setMessages: UseChatHelpers["setMessages"]
}) {
  return (
    <Button
      data-testid="stop-button"
      className="rounded-full border border-gray-300 p-1 h-8 w-8"
      onClick={event => {
        event.preventDefault()
        stop()
        setMessages(messages => messages)
      }}
    >
      <StopIcon size={14} />
    </Button>
  )
}

const StopButton = memo(PureStopButton)

function PureSendButton({ submitForm, input }: { submitForm: () => void; input: string }) {
  return (
    <Button
      data-testid="send-button"
      className="rounded-full border border-gray-300 p-1 h-8 w-8"
      onClick={event => {
        event.preventDefault()
        submitForm()
      }}
      disabled={input.length === 0}
    >
      <ArrowUpIcon size={14} />
    </Button>
  )
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.input !== nextProps.input) return false
  return true
})
