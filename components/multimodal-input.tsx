"use client"

import type { UIMessage, FileUIPart } from "ai"
import cx from "classnames"
import { Plus } from "lucide-react"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useLocalStorage } from "usehooks-ts"

import { Connections } from "@/lib/auth0-ai/connections"
import { useUser } from "@auth0/nextjs-auth0"

import { AttachmentItem } from "./attachment-item"
import { EnableIntegration } from "./enable-integration"
import { GoogleDrivePicker, GoogleFile } from "./google-picker"
import {
  ArrowUpIcon,
  GoogleIcon,
  MicrosoftIcon,
  MicrosoftIconRounded,
  SalesforceIcon,
  StopIcon,
  XboxIcon,
} from "./icons"
import { IntegrationTools } from "./integration-tools"
import { SuggestedActions } from "./suggested-actions"
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Textarea } from "./ui/textarea"
import { useLinkedAccounts } from "./use-linked-accounts-context"

import type React from "react"
import type { ChatStatus } from "ai"

// Custom attachment type that extends FileUIPart with metadata
type Attachment = FileUIPart & {
  metadata?: {
    id: string
    name: string
    iconUrl: string
    type: string
  }
}
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
  input: string
  setInput: (value: string) => void
  status: ChatStatus
  stop: () => void
  messages: Array<UIMessage>
  setMessages: (messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[])) => void
  handleSubmit: (e?: React.FormEvent, options?: { experimental_attachments?: FileUIPart[] }) => void
  append: (message: { role: "user"; content: string }) => void
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
    if (textareaRef.current && setInput) {
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
    if (setInput) {
      setInput(event.target.value)
    }
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
      const exists = prev.some(att => att.metadata?.id === file.id)

      if (exists) return prev

      const attachment: Attachment = {
        type: "file",
        mediaType: "text/plain",
        filename: file.name,
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
    setAttachments(prev => prev.filter(attachment => attachment.filename !== file.name))
  }

  return (
    <div className="relative w-full flex flex-col gap-4 pointer-events-auto">
      {messages.length === 0 && <SuggestedActions append={append} chatId={chatId} />}

      <div
        className={cx(
          "rounded-2xl border bg-white dark:bg-zinc-900 p-3 shadow-lg transition-all outline-none flex flex-col gap-3",
          {
            "border-input dark:border-zinc-700 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]":
              status === "ready",
            "border-blue-400 dark:border-blue-500 ring-blue-400/30 ring-[3px]":
              status === "submitted" || status === "streaming",
            "border-red-400 dark:border-red-500 ring-red-400/30 ring-[3px]": status === "error",
          }
        )}
      >
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
          placeholder="How can I help you today?"
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
              <PopoverTrigger className="rounded-full border border-gray-300 dark:border-zinc-700 p-1 hover:border-ring hover:ring-ring/50 hover:ring-[3px] transition-all ease-in cursor-pointer bg-white dark:bg-zinc-900">
                <div>
                  <Plus color="#5D5D5D" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[275px] flex flex-col gap-0 p-0">
                {isConnectionEnabled(Connections.google.connection) && (
                  <div className="flex items-center justify-between gap-2 hover:bg-gray-100 transition-all ease-in hover:cursor-pointer p-4 py-3 pt-3">
                    <div className="flex gap-2 items-center">
                      <GoogleIcon />
                      <span className="text-sm text-gray-600">
                        <GoogleDrivePicker onSelect={loadGoogleDocument} />
                      </span>
                    </div>
                  </div>
                )}

                {!isConnectionEnabled(Connections.google.connection) && (
                  <EnableIntegration
                    title="Connect to Google"
                    icon={<GoogleIcon />}
                    integration={Connections.google.connection}
                  />
                )}

                {!isConnectionEnabled(Connections.microsoft.connection) && (
                  <EnableIntegration
                    title="Connect to Microsoft"
                    icon={<MicrosoftIcon />}
                    integration={Connections.microsoft.connection}
                  />
                )}

                {!isConnectionEnabled(Connections.salesforce.connection) && (
                  <EnableIntegration
                    title="Connect to Salesforce"
                    icon={<SalesforceIcon />}
                    integration={Connections.salesforce.connection}
                  />
                )}

                {!isConnectionEnabled(Connections.xbox.connection) && (
                  <EnableIntegration
                    title="Connect to Xbox"
                    icon={<XboxIcon />}
                    integration={Connections.xbox.connection}
                  />
                )}
              </PopoverContent>
            </Popover>

            {isConnectionEnabled(Connections.xbox.connection) && (
              <IntegrationTools
                append={append}
                title="Xbox Tools"
                icon={<XboxIcon />}
                tools={[
                  {
                    title: "Show my Xbox profile",
                    prompt: "Show me my Xbox profile",
                  },
                  {
                    title: "Show Achivements",
                    prompt: "Show my achhievement progress for my Xbox games",
                  },
                ]}
              />
            )}

            {isConnectionEnabled(Connections.google.connection) && (
              <IntegrationTools
                append={append}
                title="Google Tools"
                icon={<GoogleIcon />}
                tools={[
                  {
                    title: "What's on my calendar?",
                    prompt: "What's on my Google calendar this week?",
                  },
                  {
                    title: "Summarize my recent emails",
                    prompt: "Summarize my Gmail inbox.",
                  },
                  {
                    title: "List files and folders",
                    prompt: "List files and folders from Google Drive",
                  },
                  {
                    title: "Create new folder",
                    prompt: "Create a new folder in Google Drive",
                  },
                ]}
              />
            )}

            {isConnectionEnabled(Connections.microsoft.connection) && (
              <IntegrationTools
                append={append}
                title="Microsoft Tools"
                icon={<MicrosoftIconRounded />}
                tools={[
                  {
                    title: "What's on my calendar?",
                    prompt: "What's on my Microsoft calendar this week?",
                  },
                  {
                    title: "Create a new appointment",
                    prompt:
                      "Create a new appointment on my Microsoft calendar for next Monday from 12-1pm.",
                  },
                  {
                    title: "Summarize my recent emails",
                    prompt: "Summarize my Microsoft inbox.",
                  },
                  {
                    title: "List files and folders",
                    prompt: "List my files and folders from Microsoft OneDrive.",
                  },
                  {
                    title: "Create a new file",
                    prompt:
                      'Create a new text file in my OneDrive and summarize the movie "2001: A Space Odyssey"',
                  },
                ]}
              />
            )}

            {isConnectionEnabled(Connections.salesforce.connection) && (
              <IntegrationTools
                append={append}
                title="Salesforce Tools"
                icon={<SalesforceIcon />}
                tools={[
                  {
                    title: "List My Accounts",
                    prompt: "List my accounts from Salesforce.",
                  },
                  {
                    title: "List My Opportunities",
                    prompt:
                      "List my open opportunities from Salesforce and include the total dollar amount at the end.",
                  },
                  {
                    title: "List My Contacts",
                    prompt: "List my contacts from Salesforce. Make any email addresses clickable.",
                  },
                ]}
              />
            )}
          </>
        )}
      </div>
      <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
        {status === "submitted" || status === "streaming" ? (
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
  setMessages: (messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[])) => void
}) {
  return (
    <Button
      data-testid="stop-button"
      className="rounded-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-white p-1 h-8 w-8"
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
      className="rounded-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-white p-1 h-8 w-8"
      onClick={event => {
        event.preventDefault()
        submitForm()
      }}
      disabled={!input || input.length === 0}
    >
      <ArrowUpIcon size={14} />
    </Button>
  )
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.input !== nextProps.input) return false
  return true
})
