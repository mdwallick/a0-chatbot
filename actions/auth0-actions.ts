"use server"

import { PostIdentitiesRequestProviderEnum } from "auth0"

import { auth0 } from "@/lib/auth0"
import { deleteUser, getUser, unlinkUser } from "@/lib/auth0-mgmt"

export async function fetchUserIdentities() {
  const session = await auth0.getSession()
  const mainUserId = session?.user.sub
  const response = await getUser(mainUserId!)
  const { data } = response

  return data.identities.map(({ connection, provider, user_id: userId }, idx) => ({
    connection,
    provider,
    userId,
    isPrimary: idx === 0,
  }))
}

export async function deleteUserAccount(connection: string) {
  try {
    const session = await auth0.getSession()
    const mainUserId = session!.user!.sub
    const accounts = await fetchUserIdentities()
    const { provider, userId } = accounts!.find(
      (acc: { connection: string }) => acc.connection === connection
    )!

    await unlinkUser(mainUserId, {
      provider: provider as PostIdentitiesRequestProviderEnum,
      user_id: userId,
    })
    await deleteUser(`${provider}|${userId}`)
  } catch (error) {
    console.error(error)
  }
}
