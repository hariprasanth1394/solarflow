"use client"

import { createContext, ReactNode, useContext, useMemo, useState } from "react"

type AppTopBarContextValue = {
  topBarContent: ReactNode
  setTopBarContent: (content: ReactNode) => void
  clearTopBarContent: () => void
}

const AppTopBarContext = createContext<AppTopBarContextValue | null>(null)

export function AppTopBarProvider({ children }: { children: ReactNode }) {
  const [topBarContent, setTopBarContentState] = useState<ReactNode>(null)

  const value = useMemo<AppTopBarContextValue>(
    () => ({
      topBarContent,
      setTopBarContent: (content: ReactNode) => setTopBarContentState(content),
      clearTopBarContent: () => setTopBarContentState(null)
    }),
    [topBarContent]
  )

  return <AppTopBarContext.Provider value={value}>{children}</AppTopBarContext.Provider>
}

export function useAppTopBar() {
  const context = useContext(AppTopBarContext)
  if (!context) {
    throw new Error("useAppTopBar must be used within AppTopBarProvider")
  }
  return context
}
