"use client"

import { createContext, ReactNode, useContext, useState, useCallback } from "react"

interface LinkedAccountsContextType {
  linkedAccounts: any
  refreshLinkedAccounts: () => Promise<void>
}

const LinkedAccountsContext = createContext<LinkedAccountsContextType | null>(null)

export const LinkedAccountsProvider = ({
  value: initialValue,
  children,
}: {
  value: any
  children: ReactNode
}) => {
  const [linkedAccounts, setLinkedAccounts] = useState(initialValue)

  const refreshLinkedAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations/linked-accounts")
      if (response.ok) {
        const data = await response.json()
        setLinkedAccounts(data)
      }
    } catch (error) {
      console.error("Failed to refresh linked accounts:", error)
    }
  }, [])

  const contextValue = {
    linkedAccounts,
    refreshLinkedAccounts,
  }

  return (
    <LinkedAccountsContext.Provider value={contextValue}>{children}</LinkedAccountsContext.Provider>
  )
}

export const useLinkedAccounts = () => {
  const context = useContext(LinkedAccountsContext)

  if (!context) {
    throw new Error("useLinkedAccounts must be used within a LinkedAccountsProvider")
  }

  return context.linkedAccounts
}

export const useRefreshLinkedAccounts = () => {
  const context = useContext(LinkedAccountsContext)

  if (!context) {
    throw new Error("useRefreshLinkedAccounts must be used within a LinkedAccountsProvider")
  }

  return context.refreshLinkedAccounts
}
