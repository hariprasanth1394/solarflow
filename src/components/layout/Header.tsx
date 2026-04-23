"use client"

import { Bell, ChevronDown, Menu, Moon, Sun } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { logout } from "../../services/authService"

type HeaderProps = {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter()
  const [dark, setDark] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [menuError, setMenuError] = useState("")

  const handleLogout = async () => {
    if (isLoggingOut) return
    setMenuError("")
    setIsLoggingOut(true)

    try {
      await logout()
      setMenuOpen(false)
      router.replace("/login")
      router.refresh()
    } catch (error) {
      setMenuError(error instanceof Error ? error.message : "Unable to log out. Please try again")
    } finally {
      setIsLoggingOut(false)
    }
  }

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
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
                {menuError ? <p className="px-3 py-2 text-xs text-rose-600">{menuError}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

    </header>
  )
}