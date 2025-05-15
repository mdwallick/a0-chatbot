"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUser } from "@auth0/nextjs-auth0"

export default function BasicInfoForm() {
  const { user } = useUser()
  const name = user?.name
  const email = user?.email
  const nickname = user?.nickname
  const phone = user?.phone_number

  return (
    <Card className="w-full shadow-none">
      <CardContent className="p-4 pt-0 md:p-6 md:pt-0 md:pb-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="grid items-center gap-2">
            <Label htmlFor="name">Name</Label>
            <Input disabled type="name" id="name" placeholder="Name" defaultValue={name} />
          </div>
          <div className="grid items-center gap-2">
            <Label htmlFor="email">Email</Label>
            <Input disabled type="email" id="email" placeholder="Email" defaultValue={email} />
          </div>
          <div className="grid items-center gap-2">
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              disabled
              type="nickname"
              id="nickname"
              placeholder="Nickname"
              defaultValue={nickname}
            />
          </div>
          <div className="grid items-center gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              disabled
              type="phone"
              id="phone"
              placeholder="(415) 555-5555"
              defaultValue={phone}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
