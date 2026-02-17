/**
 * Utility for managing enabled connections via individual environment variables.
 *
 * Environment variables:
 * - GOOGLE_CONNECTION_ID=con_xxx     → enables google-oauth2
 * - MICROSOFT_CONNECTION_ID=con_xxx  → enables windowslive
 * - SALESFORCE_CONNECTION_ID=con_xxx → enables salesforce
 * - XBOX_CONNECTION_ID=con_xxx       → enables xbox
 *
 * Set the env var to the Auth0 connection ID to enable, or leave unset to disable.
 */

/**
 * Mapping from connection names to their environment variable names.
 */
const ConnectionEnvVarMap: Record<string, string> = {
  "google-oauth2": "GOOGLE_CONNECTION_ID",
  windowslive: "MICROSOFT_CONNECTION_ID",
  salesforce: "SALESFORCE_CONNECTION_ID",
  xbox: "XBOX_CONNECTION_ID",
}

/**
 * Get the connection ID for a connection from its environment variable.
 * Returns undefined if not set.
 */
function getConnectionIdFromEnv(connectionName: string): string | undefined {
  const envVarName = ConnectionEnvVarMap[connectionName]
  if (!envVarName) {
    return undefined
  }
  const value = process.env[envVarName]
  return value && value.trim() !== "" ? value.trim() : undefined
}

/**
 * Check if a connection is enabled by its connection name.
 * @param connectionName - The connection name (e.g., "google-oauth2", "salesforce")
 */
export function isConnectionEnabled(connectionName: string): boolean {
  return !!getConnectionIdFromEnv(connectionName)
}

/**
 * Get the connection ID for an enabled connection.
 * @param connectionName - The connection name
 * @returns The connection ID or undefined if not enabled
 */
export function getConnectionId(connectionName: string): string | undefined {
  return getConnectionIdFromEnv(connectionName)
}

/**
 * Get list of all enabled connection names.
 */
export function getEnabledConnectionNames(): string[] {
  return Object.keys(ConnectionEnvVarMap).filter(connectionName =>
    isConnectionEnabled(connectionName)
  )
}

/**
 * Map of provider names (used in code) to their connection names.
 */
export const ProviderConnectionMap = {
  google: "google-oauth2",
  microsoft: "windowslive",
  salesforce: "salesforce",
  xbox: "xbox",
} as const

export type ProviderName = keyof typeof ProviderConnectionMap

/**
 * Check if a provider is enabled by its friendly name.
 * @param provider - The provider name (e.g., "google", "salesforce")
 */
export function isProviderEnabled(provider: ProviderName): boolean {
  const connectionName = ProviderConnectionMap[provider]
  return isConnectionEnabled(connectionName)
}

/**
 * Get list of enabled providers by their friendly names.
 */
export function getEnabledProviders(): ProviderName[] {
  return (Object.keys(ProviderConnectionMap) as ProviderName[]).filter(provider =>
    isProviderEnabled(provider)
  )
}

/**
 * Get the environment variable name for a connection.
 * Useful for debugging or documentation.
 */
export function getEnvVarNameForConnection(connectionName: string): string | undefined {
  return ConnectionEnvVarMap[connectionName]
}
