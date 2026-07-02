"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

type InventoryTabActionsContextValue = {
  actions: ReactNode | null
  setActions: (node: ReactNode | null) => void
}

const InventoryTabActionsContext = createContext<InventoryTabActionsContextValue | null>(null)

export function InventoryTabActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode | null>(null)
  const value = useMemo(() => ({ actions, setActions }), [actions])
  return <InventoryTabActionsContext.Provider value={value}>{children}</InventoryTabActionsContext.Provider>
}

export function useInventoryTabActions() {
  const context = useContext(InventoryTabActionsContext)
  if (!context) {
    throw new Error("useInventoryTabActions must be used within InventoryTabActionsProvider")
  }
  return context
}
