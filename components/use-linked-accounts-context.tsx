"use client"

import { createContext, ReactNode, useContext } from "react"

const LinkedAccountsContext = createContext({})

export const LinkedAccountsProvider = ({
  value,
  children,
}: {
  value: any
  children: ReactNode
}) => {
  return <LinkedAccountsContext.Provider value={value}>{children}</LinkedAccountsContext.Provider>
}

export const useLinkedAccounts = () => {
  const context = useContext(LinkedAccountsContext)

  if (!context) {
    throw new Error("useLinkedAccounts must be used within a LinkedAccountsProvider")
  }

  return context
}
