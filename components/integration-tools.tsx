"use client"

import { ArrowUpRight } from "lucide-react"
import { generateUUID } from "@/lib/utils"
import { PopoverClose } from "@radix-ui/react-popover"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
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
  append: (message: { role: "user"; content: string }) => void
}) {
  return (
    <Popover>
      <PopoverTrigger>
        <div className="rounded-full hover:border-ring hover:ring-ring/50 hover:ring-[3px] transition-all ease-in cursor-pointer">
          {icon}
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="top"
        className="w-fit p-0 bg-popover text-popover-foreground border border-border"
      >
        <div className="text-xs font-medium w-full px-4 py-2 bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground rounded-t-md">
          {title}
        </div>
        <ul className="flex flex-col text-sm text-muted-foreground dark:text-muted-foreground">
          {tools.map(tool => (
            <PopoverClose asChild key={generateUUID()}>
              <li
                className="transition-all ease-in cursor-pointer p-4 py-3 pt-3 flex justify-between items-center gap-4 hover:bg-muted/60 dark:hover:bg-muted/40"
                onClick={async () => {
                  append({
                    role: "user",
                    content: tool.prompt,
                  })
                }}
              >
                {tool.title}
                <ArrowUpRight
                  className="text-muted-foreground dark:text-muted-foreground"
                  size={15}
                />
              </li>
            </PopoverClose>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
