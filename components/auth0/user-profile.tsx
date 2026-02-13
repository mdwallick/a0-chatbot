"use client"

import clsx, { ClassValue } from "clsx"
import { useEffect, useState } from "react"
import { twMerge } from "tailwind-merge"

import { deleteUserAccount, fetchUserIdentities } from "@/actions/auth0-actions"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import type { ConnectionConfig } from "../connections"
import BasicInfoForm from "./basic-info-form"
import ConnectedAccounts from "./connected-accounts"
import AppearanceSettings from "./appearance-settings"
import AccountSettings from "./account-settings"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface UserProfileProps {
  availableConnections: ConnectionConfig[]
}

export default function UserProfile({ availableConnections }: UserProfileProps) {
  const [currentItem, setCurrentItem] = useState("basic-info")
  useEffect(() => {
    setCurrentItem(window.location.hash.substring(1) || "basic-info")
  }, [])

  const handleItemClick = (id: string) => () => {
    setCurrentItem(id)
  }

  return (
    <div className="max-w-screen-lg mx-auto gap-5 md:gap-5 lg:gap-5 justify-center p-2 flex flex-col w-full">
      <div className="md:block">
        <div className="space-y-0.5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Settings</h2>
        </div>
        <Separator className="my-6 hidden sm:inline-block" />
        <div className="flex flex-col space-y-2 sm:space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0 mt-4 sm:mt-0">
          <aside className="lg:w-1/5">
            <nav
              className={cn(
                "flex space-x-1 lg:flex-col lg:space-x-0 lg:space-y-1 justify-start w-full",
                "bg-muted sm:bg-transparent dark:bg-zinc-900 sm:dark:bg-transparent",
                "rounded-lg sm:rounded-none p-1.5 sm:p-0"
              )}
            >
              {[
                { title: "Profile", id: "basic-info" },
                { title: "Appearance", id: "appearance" },
                { title: "Account", id: "account" },
              ].map(item => (
                <button
                  onClick={handleItemClick(item.id)}
                  type="button"
                  key={item.id}
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    currentItem === item.id
                      ? "bg-white dark:bg-zinc-800 hover:bg-white dark:hover:bg-zinc-800 sm:bg-muted sm:hover:bg-muted font-medium"
                      : "sm:hover:bg-gray-50 dark:sm:hover:bg-zinc-800 sm:cursor-pointer text-muted-foreground font-light transition-all",
                    "justify-start",
                    "px-3 py-3",
                    "flex-1 justify-center sm:justify-start"
                  )}
                >
                  {item.title}
                </button>
              ))}
            </nav>
          </aside>
          <div className="flex-1">
            {currentItem === "basic-info" && (
              <div className="flex flex-col space-y-6">
                <BasicInfoForm />
                <ConnectedAccounts
                  availableAccounts={availableConnections}
                  allowLink={true}
                  onFetch={fetchUserIdentities}
                  onUnlink={deleteUserAccount}
                />
              </div>
            )}
            {currentItem === "appearance" && (
              <div className="flex flex-col space-y-6">
                <AppearanceSettings />
              </div>
            )}
            {currentItem === "account" && (
              <div className="flex flex-col space-y-6">
                <AccountSettings />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
