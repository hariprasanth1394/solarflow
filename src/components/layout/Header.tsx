"use client"

import { Bell, ChevronDown, Menu, Moon, Search, Sun } from "lucide-react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"

type HeaderProps = {
  onMenuClick?: () => void
}

function pathToLabel(pathname: string) {
  if (pathname === "/") return ["Dashboard"]
  return pathname
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/-/g, " ").replace(/\b\w/g, (match) => match.toUpperCase()))
}

export default function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const breadcrumbs = useMemo(() => pathToLabel(pathname), [pathname])
  const [dark, setDark] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onMenuClick} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" aria-label="Open sidebar">
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <Image
            src="/assets/solarflow-logo-dark.svg"
            alt="Solar Flow"
            width={156}
            height={38}
            priority
            className="h-8 w-32 object-contain md:h-9 md:w-36"
          />
        </div>

        <div className="relative hidden flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search customers, tasks, inventory..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none ring-violet-500 focus:ring-2"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <button type="button" className="relative rounded-lg p-2 hover:bg-slate-100" aria-label="Notifications">
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
          </button>

          <button
            type="button"
            onClick={() => setDark((prev) => !prev)}
            className="rounded-lg p-2 hover:bg-slate-100"
            aria-label="Toggle theme"
            title="Theme toggle"
          >
            {dark ? <Moon className="h-5 w-5 text-slate-600" /> : <Sun className="h-5 w-5 text-slate-600" />}
          </button>

          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((prev) => !prev)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-1.5 hover:bg-slate-50">
              <div className="h-7 w-7 rounded-full bg-slate-300" />
              <span className="hidden text-sm font-medium md:inline">Admin</span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-11 z-20 min-w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-md">
                <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100">
                  Profile
                </button>
                <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100">
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-2 hidden items-center gap-2 text-xs text-slate-500 md:flex">
        {breadcrumbs.map((crumb, index) => (
          <div key={`${crumb}-${index}`} className="flex items-center gap-2">
            <span>{crumb}</span>
            {index < breadcrumbs.length - 1 ? <span>/</span> : null}
          </div>
        ))}
      </div>
    </header>
  )
}