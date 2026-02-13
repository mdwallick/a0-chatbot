/**
 * Utility for managing enabled connections via ENABLED_CONNECTIONS env var.
 *
 * Format: JSON object mapping connection names to connection IDs (or true to enable)
 * Example: '{"google-oauth2":"con_xxx","windowslive":"con_xxx","salesforce":"con_xxx","xbox":"con_xxx"}'
 *
 * Connection names correspond to the "connection" field in ConnectionsMetadata:
 * - google-oauth2 (Google)
 * - windowslive (Microsoft)
 * - salesforce (Salesforce)
 * - xbox (Xbox)
 */

type EnabledConnectionsConfig = Record<string, string | boolean>

let cachedConfig: EnabledConnectionsConfig | null = null

/**
 * Parse and cache the ENABLED_CONNECTIONS environment variable.
 * Returns an empty object if not set or invalid.
 */
function getConfig(): EnabledConnectionsConfig {
  if (cachedConfig !== null) {
    return cachedConfig
  }

  const envValue = process.env.ENABLED_CONNECTIONS
  if (!envValue) {
    console.warn("[EnabledConnections] ENABLED_CONNECTIONS not set, all connections disabled")
    cachedConfig = {}
    return cachedConfig
  }

  try {
    cachedConfig = JSON.parse(envValue) as EnabledConnectionsConfig
    return cachedConfig
  } catch (error) {
    console.error("[EnabledConnections] Failed to parse ENABLED_CONNECTIONS:", error)
    cachedConfig = {}
    return cachedConfig
  }
}

/**
 * Check if a connection is enabled by its connection name.
 * @param connectionName - The connection name (e.g., "google-oauth2", "salesforce")
 */
export function isConnectionEnabled(connectionName: string): boolean {
  const config = getConfig()
  return connectionName in config && !!config[connectionName]
}

/**
 * Get the connection ID for an enabled connection.
 * @param connectionName - The connection name
 * @returns The connection ID or undefined if not enabled
 */
export function getConnectionId(connectionName: string): string | undefined {
  const config = getConfig()
  const value = config[connectionName]
  if (typeof value === "string") {
    return value
  }
  return undefined
}

/**
 * Get list of all enabled connection names.
 */
export function getEnabledConnectionNames(): string[] {
  const config = getConfig()
  return Object.keys(config).filter(key => !!config[key])
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
 * Clear the cached config (useful for testing or when env var changes).
 */
export function clearCache(): void {
  cachedConfig = null
}
