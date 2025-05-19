"use client"

import Link from "next/link"

import UserButton from "@/components/auth0/user-button"
import { Auth0Icon, IconAuth0 } from "@/components/icons"
import { DropdownMenuShortcut } from "@/components/ui/dropdown-menu"
import { useUser } from "@auth0/nextjs-auth0"
import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu"

import { Button } from "./ui/button"
import ThemeToggle from "./theme-toggle"

export default function Header() {
  const { user } = useUser()

  return (
    <header className="z-50 flex items-center justify-between w-full px-5 sm:px-6 py-3 h-14 shrink-0 gap-6 sm:gap-0 bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
      <div className="flex items-center gap-6">
        <span className="inline-flex items-center home-links whitespace-nowrap">
          <Link href="/" rel="noopener">
            <IconAuth0 className="hidden sm:inline-flex text-black dark:text-white" />
            <Auth0Icon className="inline-flex sm:hidden text-black dark:text-white" />
          </Link>
        </span>
      </div>

      <div className="items-center justify-end gap-6 hidden sm:flex">
        <div className="flex items-center justify-end gap-4">
          <ThemeToggle />
          {user ? (
            <UserButton user={user}>
              <DropdownMenuItem className="flex items-center px-2 py-1">
                <a href="/profile" className="flex gap-2 items-center text-sm w-full">
                  Profile
                  <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
                </a>
              </DropdownMenuItem>
            </UserButton>
          ) : (
            <Button asChild variant="outline">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
