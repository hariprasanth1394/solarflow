"use client"

import { useEffect, useState } from "react"
import Header from "./Header"
import Sidebar from "./Sidebar"

type AppLayoutProps = {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("solarflow-theme")
    if (savedTheme === "dark") {
      setDark(true)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add("theme-dark")
      window.localStorage.setItem("solarflow-theme", "dark")
    } else {
      root.classList.remove("theme-dark")
      window.localStorage.setItem("solarflow-theme", "light")
    }
  }, [dark])

  return (
    <div
      data-app-surface="true"
      className={`flex h-screen w-full overflow-hidden ${dark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}
    >
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileOpen(true)} dark={dark} onToggleTheme={() => setDark((prev) => !prev)} />
        <main
          data-app-main="true"
          className={`flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 ${dark ? "bg-slate-900" : "bg-slate-50"}`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
