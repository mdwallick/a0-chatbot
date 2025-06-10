"use server"

import { PostIdentitiesRequestProviderEnum } from "auth0"

import { auth0 } from "@/lib/auth0"
import { deleteUser, getUser, unlinkUser } from "@/lib/auth0-mgmt"
import { prisma } from "@/lib/prisma"

export async function fetchUserIdentities() {
  const session = await auth0.getSession()
  const mainUserId = session?.user.sub
  const response = await getUser(mainUserId!)
  const { data } = response

  const userConsentedScopes = await prisma.grantedScope.findMany({
    where: {
      userId: mainUserId,
    },
    select: {
      connectionId: true,
      scope: true,
    },
  })

  const connectedAccountsWithScopes = data.identities.map((identity, idx) => {
    const { connection, provider, user_id: providerSpecificUserId } = identity

    const specificScopesForThisConnection = userConsentedScopes
      .filter(dbScope => dbScope.connectionId === connection)
      .map(dbScope => dbScope.scope)

    return {
      connection,
      provider,
      userId: providerSpecificUserId,
      isPrimary: idx === 0,
      grantedScopes: specificScopesForThisConnection,
    }
  })

  return connectedAccountsWithScopes
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

    // also remove any locally tracked scopes
    const scopeResult = await prisma.grantedScope.deleteMany({
      where: {
        userId: mainUserId,
        connectionId: connection,
      },
    })
  } catch (error) {
    console.error(error)
  }
}
