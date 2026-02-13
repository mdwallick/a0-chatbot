import { ChevronLeftIcon } from "lucide-react"
import Link from "next/link"

import UserProfile from "@/components/auth0/user-profile"
import { getEnabledConnections } from "@/components/connections"

export default async function Profile() {
  const enabledConnections = getEnabledConnections()

  return (
    <div
      className="flex flex-col min-w-0 h-dvh bg-background w-full"
      style={{ maxHeight: "calc(100vh - 56px)" }}
    >
      <div className="flex-col md:flex flex-1 overflow-y-scroll">
        <div className="flex-1 space-y-4 p-5 sm:p-8 pt-6">
          <div className="max-w-screen-lg mx-auto justify-center">
            <div className="flex items-center space-x-1 text-sm">
              <ChevronLeftIcon className="h-4 w-4" />
              <Link href="/" className="font-light">
                Back to chat
              </Link>
            </div>
          </div>
          <UserProfile availableConnections={enabledConnections} />
        </div>
      </div>
    </div>
  )
}
