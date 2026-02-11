"use server"

import { auth0 } from "@/lib/auth0"
import { updateUserProfile } from "@/lib/auth0-mgmt"

export async function updateProfile({ name, nickname }: { name?: string; nickname?: string }) {
  const session = await auth0.getSession()
  if (!session?.user?.sub) {
    throw new Error("Not authenticated")
  }

  await updateUserProfile(session.user.sub, { name, nickname })
}
