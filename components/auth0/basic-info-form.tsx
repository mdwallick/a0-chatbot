"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { useUser } from "@auth0/nextjs-auth0"

import EditableField from "./editable-field"
import { updateProfile } from "@/actions/profile-actions"

export default function BasicInfoForm() {
  const { user } = useUser()
  const router = useRouter()
  const name = user?.name
  const email = user?.email
  const nickname = user?.nickname
  const phone = user?.phone_number

  const handleSaveName = useCallback(
    async (value: string) => {
      await updateProfile({ name: value })
      router.refresh()
    },
    [router]
  )

  const handleSaveNickname = useCallback(
    async (value: string) => {
      await updateProfile({ nickname: value })
      router.refresh()
    },
    [router]
  )

  return (
    <Card className="w-full shadow-none">
      <CardContent className="p-4 pt-0 md:p-6 md:pt-0 md:pb-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EditableField
            label="Name"
            value={name}
            onSave={handleSaveName}
            editable={true}
            placeholder="Name"
          />
          <EditableField
            label="Email"
            value={email}
            onSave={async () => {}}
            editable={false}
            hint="Cannot change"
            type="email"
            placeholder="Email"
          />
          <EditableField
            label="Nickname"
            value={nickname}
            onSave={handleSaveNickname}
            editable={true}
            placeholder="Nickname"
          />
          <EditableField
            label="Phone"
            value={phone}
            onSave={async () => {}}
            editable={false}
            hint="Contact support"
            type="tel"
            placeholder="(415) 555-5555"
          />
        </div>
      </CardContent>
    </Card>
  )
}
