"use server"

import {
  DeleteUserIdentityByUserIdProviderEnum,
  ManagementClient,
  PostIdentitiesRequestProviderEnum,
} from "auth0"

const auth0 = new ManagementClient({
  domain: new URL(process.env.AUTH0_ISSUER_BASE_URL!).host,
  clientId: process.env.AUTH0_CLIENT_ID_MGMT!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET_MGMT!,
})

export async function getUserMetadata(user_id: string) {
  const {
    data: { user_metadata },
  } = await auth0.users.get({ id: user_id })
  return user_metadata
}

export async function setUserMetadata(user_id: string, metadata: Record<string, unknown>) {
  await auth0.users.update({ id: user_id }, { user_metadata: metadata })
}

export async function getUser(userId: string) {
  return auth0.users.get({ id: userId })
}

export async function deleteUser(userId: string) {
  return auth0.users.delete({
    id: userId,
  })
}

export type IdentityToLink = {
  provider: PostIdentitiesRequestProviderEnum
  user_id: string
  connection_id?: string
}

export async function linkUser(userId: string, identity: IdentityToLink) {
  await auth0.users.link({ id: userId }, identity)
}

export async function unlinkUser(
  userId: string,
  identityToRemove: {
    provider: DeleteUserIdentityByUserIdProviderEnum
    user_id: string
  }
) {
  return auth0.users.unlink({
    id: userId,
    ...identityToRemove,
  })
}

export async function updateUser(
  userId: string,
  { givenName, familyName }: { givenName?: string; familyName?: string }
) {
  return auth0.users.update(
    { id: userId },
    {
      given_name: givenName ?? undefined,
      family_name: familyName ?? undefined,
    }
  )
}

export async function getLinkedAccounts(userId: string) {
  const response = await getUser(userId!)
  const { data } = response

  return data.identities.map(({ connection, provider, user_id: userId }, idx) => ({
    connection,
    provider,
    userId,
    isPrimary: idx === 0,
  }))
}
