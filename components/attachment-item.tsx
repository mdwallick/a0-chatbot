/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
"use client"

import { useCallback, useEffect, useState } from "react"

import { GoogleFile } from "./google-picker"
import { Spinner } from "./spinner"

import type React from "react"

export function AttachmentItem({
  file,
  readOnly,
  onRemove,
  onDidLoad,
}: {
  file: GoogleFile
  readOnly?: boolean
  onDidLoad?: (file: GoogleFile) => void
  onRemove?: (file: GoogleFile) => void
}) {
  const [working, setWorking] = useState<boolean>(true)

  const fetchFile = useCallback(async () => {
    const response = await fetch(`/api/integrations/google?documentID=${file.id}`)
    const data = await response.json()

    file.content = data.content

    if (typeof onDidLoad === "function") {
      onDidLoad(file)
    }
    setWorking(false)
  }, [])

  useEffect(() => {
    if (!readOnly) {
      fetchFile()
    }
  }, [])

  const handleRemove = () => {
    if (typeof onRemove === "function") {
      onRemove(file)
    }
  }

  return (
    <div className="flex border rounded-lg p-2 pr-4 gap-2 w-fit relative">
      {!readOnly && (
        <button
          className="absolute -top-1.5 -right-2 cursor-pointer"
          type="button"
          onClick={handleRemove}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="7.085" cy="7.085" r="7.085" fill="black" />
            <path
              d="M9.25 5L5 9.25"
              stroke="white"
              strokeWidth="1.41667"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5 5L9.25 9.25"
              stroke="white"
              strokeWidth="1.41667"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      <div className="min-w-10 h-10 bg-gray-100 flex items-center justify-center rounded-sm">
        {working && !readOnly ? <Spinner /> : <img src={file.iconUrl} alt={file.name} />}
      </div>
      <div className="flex flex-col gap-0">
        <div className="text-sm font-medium">{file.name}</div>
        <div className="text-sm text-muted-foreground">Google Docs</div>
      </div>
    </div>
  )
}
