"use client"

import { ArrowUpRight } from "lucide-react"

import { generateUUID } from "@/lib/utils"
import { PopoverClose } from "@radix-ui/react-popover"

import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"

import type { UseChatHelpers } from "@ai-sdk/react"
import type React from "react"

type ToolDescription = {
  title: string
  prompt: string
}

export function IntegrationTools({
  title,
  icon,
  tools,
  append,
}: {
  title: string
  icon: React.ReactNode
  tools: ToolDescription[]
  append: UseChatHelpers["append"]
}) {
  return (
    <Popover>
      <PopoverTrigger>
        <div className="rounded-full hover:border-ring hover:ring-ring/50 hover:ring-[3px] transition-all ease-in cursor-pointer">
          {icon}
        </div>
      </PopoverTrigger>
      <PopoverContent align="center" side="top" className="w-fit p-0">
        <div
          className="text-xs font-medium w-full p-2 px-4"
          style={{
            backgroundColor: "#f9fafb",
            borderTopRightRadius: "8px",
            borderTopLeftRadius: "8px",
          }}
        >
          {title}
        </div>
        <ul className="flex flex-col text-sm text-gray-600">
          {tools.map(tool => (
            <PopoverClose asChild key={generateUUID()}>
              <li
                className="hover:bg-gray-100 transition-all ease-in hover:cursor-pointer p-4 py-3 pt-3 flex justify-between items-center gap-4"
                onClick={async () => {
                  append({
                    role: "user",
                    content: tool.prompt,
                  })
                }}
              >
                {tool.title}
                <ArrowUpRight color="#5D5D5D" size={15} />
              </li>
            </PopoverClose>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
