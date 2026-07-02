"use client"

import { Bell, Menu, Moon, Sun } from "lucide-react"
import Image from "next/image"
import UserDropdown from "@/components/ui/UserDropdown"
import { getInitials, withAvatarCacheBust } from "@/lib/avatarUtils"
import { useAuthContext } from "@/contexts/AuthContext"
import { toggleTheme } from "@/lib/theme"

type HeaderProps = {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { profile } = useAuthContext()

  const userName = profile?.fullName || profile?.email || "User"
  const userAvatar = withAvatarCacheBust(profile?.avatarUrl, profile?.updatedAt)
  const initials = getInitials(userName)

  return (
    <header
      data-app-header="true"
      className="sf-sticky-header border-b border-slate-200 bg-white/90 px-4 py-3 text-slate-900 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 md:px-6"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Open sidebar"
        >
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
          <button
            type="button"
            className="relative rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
            title="Theme toggle"
          >
            <Sun className="h-5 w-5 text-slate-600 dark:hidden" />
            <Moon className="hidden h-5 w-5 text-slate-300 dark:block" />
          </button>

          <div className="relative">
            <UserDropdown name={userName} avatar={userAvatar} initials={initials} />
          </div>
        </div>
      </div>
    </header>
  )
}
