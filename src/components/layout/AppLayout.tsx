"use client"

import { useState } from "react"
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
  const { topBarContent } = useAppTopBar()

  return (
    <div
      data-app-surface="true"
      className="flex h-screen w-full overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
    >
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sf-layer-topbar">
          <Header onMenuClick={() => setMobileOpen((prev) => !prev)} />
          {topBarContent ? (
            <div className="sf-sticky-subnav sf-layer-subnav border-b border-slate-200 backdrop-blur dark:border-slate-800" style={{ backgroundColor: "color-mix(in srgb, var(--sf-card-bg) 96%, transparent)" }}>
              {topBarContent}
            </div>
          ) : null}
        </div>
        <main
          data-app-scroll-container="true"
          data-app-main="true"
          className="sf-layer-content overflow-y-auto overscroll-y-contain overflow-x-hidden bg-slate-50 p-4 pb-24 dark:bg-slate-900 md:p-6 md:pb-6"
          style={{ height: topBarContent ? "calc(100dvh - 116px)" : "calc(100dvh - 64px)" }}
        >
          {children}
        </main>
        <GoTopButton />
      </div>
    </div>
  )
}
