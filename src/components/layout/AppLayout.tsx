"use client"

import { useEffect, useState } from "react"
import { AppTopBarProvider, useAppTopBar } from "./AppTopBarContext"
import Header from "./Header"
import Sidebar from "./Sidebar"
import GoTopButton from "@/components/ui/GoTopButton"

type AppLayoutProps = {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <AppTopBarProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </AppTopBarProvider>
  )
}

function AppLayoutInner({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof document === "undefined") return false
    return document.documentElement.classList.contains("theme-dark")
  })
  const { topBarContent } = useAppTopBar()

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("solarflow-theme")
    if (savedTheme === "dark") setDark(true)
    if (savedTheme === "light") setDark(false)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add("theme-dark")
      root.classList.add("dark")
      window.localStorage.setItem("solarflow-theme", "dark")
    } else {
      root.classList.remove("theme-dark")
      root.classList.remove("dark")
      window.localStorage.setItem("solarflow-theme", "light")
    }
  }, [dark])

  return (
    <div
      data-app-surface="true"
      className={`flex h-screen w-full overflow-x-hidden ${dark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}
    >
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className={`sf-layer-topbar ${mobileOpen ? "pointer-events-none lg:pointer-events-auto" : ""}`} aria-hidden={mobileOpen ? true : undefined}>
          <Header onMenuClick={() => setMobileOpen(true)} dark={dark} onToggleTheme={() => setDark((prev) => !prev)} />
          {topBarContent ? (
            <div className="sf-sticky-subnav sf-layer-subnav border-b border-slate-200 backdrop-blur" style={{ backgroundColor: "color-mix(in srgb, var(--sf-card-bg) 96%, transparent)" }}>
              {topBarContent}
            </div>
          ) : null}
        </div>
        <main
          data-app-scroll-container="true"
          data-app-main="true"
          className={`sf-layer-content overflow-y-auto overscroll-y-contain overflow-x-hidden p-4 pb-24 md:p-6 md:pb-6 ${dark ? "bg-slate-900" : "bg-slate-50"}`}
          style={{ height: topBarContent ? "calc(100dvh - 116px)" : "calc(100dvh - 64px)" }}
        >
          {children}
        </main>
        <GoTopButton />
      </div>
    </div>
  )
}
