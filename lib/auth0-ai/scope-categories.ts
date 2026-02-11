// Categorization of scopes for display purposes

export type ScopeCategory = "Communication" | "Calendar" | "Files" | "Profile" | "Other"

// Map of connection IDs to scope categorizations
export const ScopeCategoryMap: Record<string, Record<string, ScopeCategory>> = {
  "google-oauth2": {
    "https://www.googleapis.com/auth/userinfo.profile": "Profile",
    "https://www.googleapis.com/auth/userinfo.email": "Profile",
    "https://www.googleapis.com/auth/gmail.readonly": "Communication",
    "https://www.googleapis.com/auth/gmail.modify": "Communication",
    "https://www.googleapis.com/auth/gmail.send": "Communication",
    "https://www.googleapis.com/auth/calendar.events.readonly": "Calendar",
    "https://www.googleapis.com/auth/calendar.events": "Calendar",
    "https://www.googleapis.com/auth/drive.readonly": "Files",
    "https://www.googleapis.com/auth/drive": "Files",
  },
  windowslive: {
    offline_access: "Other",
    "https://graph.microsoft.com/User.Read": "Profile",
    "https://graph.microsoft.com/Mail.Read": "Communication",
    "https://graph.microsoft.com/Mail.ReadWrite": "Communication",
    "https://graph.microsoft.com/Mail.Send": "Communication",
    "https://graph.microsoft.com/Calendars.Read": "Calendar",
    "https://graph.microsoft.com/Calendars.ReadWrite": "Calendar",
    "https://graph.microsoft.com/Files.Read": "Files",
    "https://graph.microsoft.com/Files.ReadWrite": "Files",
  },
  salesforce: {
    id: "Profile",
    api: "Other",
    refresh_token: "Other",
  },
  xbox: {
    "XboxLive.signin": "Profile",
    "XboxLive.offline_access": "Other",
  },
}

// Ordered categories for display
export const CategoryOrder: ScopeCategory[] = [
  "Profile",
  "Communication",
  "Calendar",
  "Files",
  "Other",
]

/**
 * Categorizes scopes by their category for a given connection.
 * @param connectionId - The connection identifier (e.g., "google-oauth2")
 * @param scopes - Array of scope strings to categorize
 * @returns Record mapping categories to arrays of scopes
 */
export function categorizeScopes(
  connectionId: string,
  scopes: string[]
): Record<ScopeCategory, string[]> {
  const result: Record<ScopeCategory, string[]> = {
    Profile: [],
    Communication: [],
    Calendar: [],
    Files: [],
    Other: [],
  }

  const categoryMap = ScopeCategoryMap[connectionId] || {}

  for (const scope of scopes) {
    const category = categoryMap[scope] || "Other"
    result[category].push(scope)
  }

  return result
}

/**
 * Gets non-empty categories in display order.
 * @param categorizedScopes - The result from categorizeScopes
 * @returns Array of [category, scopes] tuples for non-empty categories
 */
export function getNonEmptyCategories(
  categorizedScopes: Record<ScopeCategory, string[]>
): [ScopeCategory, string[]][] {
  return CategoryOrder.filter(category => categorizedScopes[category].length > 0).map(category => [
    category,
    categorizedScopes[category],
  ])
}
