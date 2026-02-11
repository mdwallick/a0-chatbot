/**
 * Auth0 My Account API helpers for Connected Accounts flow
 * https://auth0.com/docs/secure/call-apis-on-users-behalf/token-vault/connected-accounts-for-token-vault
 */

// Use the custom domain (AUTH0_DOMAIN) for user-facing URLs
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN!
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID!
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET!

// My Account API audience
const MY_ACCOUNT_AUDIENCE = `https://${AUTH0_DOMAIN}/me/`

/**
 * Exchange a refresh token for a My Account API access token
 * This token is needed to manage connected accounts
 */
export async function getMyAccountAccessToken(refreshToken: string): Promise<string> {
  const tokenEndpoint = `https://${AUTH0_DOMAIN}/oauth/token`

  console.log("[My Account API] Getting access token from:", tokenEndpoint)
  console.log("[My Account API] Audience:", MY_ACCOUNT_AUDIENCE)

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      refresh_token: refreshToken,
      audience: MY_ACCOUNT_AUDIENCE,
      scope: "create:me:connected_accounts read:me:connected_accounts delete:me:connected_accounts",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("[My Account API] Failed to get access token:", error)
    console.error("[My Account API] Token endpoint was:", tokenEndpoint)
    throw new Error(`Failed to get My Account API token: ${error}`)
  }

  const data = await response.json()
  console.log("[My Account API] Successfully got access token")
  return data.access_token
}

/**
 * Initiate a connected account flow
 * Returns connect_uri and auth_session for the authorization flow
 */
export async function initiateConnectedAccount(
  accessToken: string,
  params: {
    connection: string
    redirectUri: string
    state: string
    scopes: string[]
  }
): Promise<{
  auth_session: string
  connect_uri: string
  connect_params?: { ticket: string }
  expires_in: number
}> {
  const endpoint = `https://${AUTH0_DOMAIN}/me/v1/connected-accounts/connect`

  console.log("[My Account API] Initiating connection at:", endpoint)
  console.log("[My Account API] Request params:", {
    connection: params.connection,
    redirect_uri: params.redirectUri,
    scopes: params.scopes,
  })

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      connection: params.connection,
      redirect_uri: params.redirectUri,
      state: params.state,
      scopes: params.scopes,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("[My Account API] Failed to initiate connection:", error)
    console.error("[My Account API] Endpoint was:", endpoint)
    throw new Error(`Failed to initiate connected account: ${error}`)
  }

  const result = await response.json()
  console.log("[My Account API] Connect response (full):", JSON.stringify(result, null, 2))

  return result
}

/**
 * Complete a connected account flow after user authorization
 */
export async function completeConnectedAccount(
  accessToken: string,
  params: {
    authSession: string
    connectCode: string
    redirectUri: string
  }
): Promise<{
  id: string
  connection: string
  created_at: string
  scopes: string[]
  access_type: string
}> {
  const endpoint = `https://${AUTH0_DOMAIN}/me/v1/connected-accounts/complete`

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      auth_session: params.authSession,
      connect_code: params.connectCode,
      redirect_uri: params.redirectUri,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("[My Account API] Failed to complete connection:", error)
    throw new Error(`Failed to complete connected account: ${error}`)
  }

  return response.json()
}

/**
 * List connected accounts for the current user
 */
export async function listConnectedAccounts(accessToken: string): Promise<
  Array<{
    id: string
    connection: string
    created_at: string
    scopes: string[]
  }>
> {
  const endpoint = `https://${AUTH0_DOMAIN}/me/v1/connected-accounts`

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("[My Account API] Failed to list connected accounts:", error)
    throw new Error(`Failed to list connected accounts: ${error}`)
  }

  return response.json()
}

/**
 * Delete a connected account
 */
export async function deleteConnectedAccount(
  accessToken: string,
  connectionId: string
): Promise<void> {
  const endpoint = `https://${AUTH0_DOMAIN}/me/v1/connected-accounts/${connectionId}`

  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("[My Account API] Failed to delete connected account:", error)
    throw new Error(`Failed to delete connected account: ${error}`)
  }
}
