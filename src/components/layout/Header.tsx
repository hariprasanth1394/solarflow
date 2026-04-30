"use client"

import { Bell, Menu, Moon, Sun } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"
import UserDropdown from "@/components/ui/UserDropdown"
import { supabase } from "@/lib/supabaseClient"

type HeaderProps = {
  onMenuClick?: () => void
  dark?: boolean
  onToggleTheme?: () => void
}

export default function Header({ onMenuClick, dark: controlledDark, onToggleTheme }: HeaderProps) {
  const [internalDark, setInternalDark] = useState(false)
  const [userName, setUserName] = useState("Admin")
  const [userAvatar, setUserAvatar] = useState<string | null>(null)

  const dark = typeof controlledDark === "boolean" ? controlledDark : internalDark

  useEffect(() => {
    if (typeof controlledDark === "boolean") return
    const savedTheme = window.localStorage.getItem("solarflow-theme")
    if (savedTheme === "dark") {
      setInternalDark(true)
    }
  }, [controlledDark])

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser()
        if (!authData?.user) return

        const { data: profileData } = await supabase
          .from("users")
          .select("first_name, last_name, avatar_url")
          .eq("id", authData.user.id)
          .single()

        if (profileData) {
          const profile = profileData as { first_name?: string; last_name?: string; avatar_url?: string }
          const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
          setUserName(fullName || authData.user.email || "User")
          if (profile.avatar_url) {
            setUserAvatar(profile.avatar_url)
          }
        }
      } catch (error) {
        console.error("Error loading user:", error)
      }
    }

    void loadUser()
  }, [])

  const handleThemeToggle = () => {
    if (onToggleTheme) {
      onToggleTheme()
      return
    }

    setInternalDark((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add("theme-dark")
        window.localStorage.setItem("solarflow-theme", "dark")
      } else {
        document.documentElement.classList.remove("theme-dark")
        window.localStorage.setItem("solarflow-theme", "light")
      }
      return next
    })
  }

  return (
    <header
      data-app-header="true"
      className={`sf-sticky-header border-b px-4 py-3 md:px-6 ${dark ? "border-slate-800 bg-slate-900/90 text-slate-100" : "border-slate-200 bg-white/90"}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className={`rounded-lg p-2 lg:hidden ${dark ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
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
            className={`relative rounded-lg p-2 ${dark ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
            aria-label="Notifications"
          >
            <Bell className={`h-5 w-5 ${dark ? "text-slate-300" : "text-slate-600"}`} />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
          </button>

          <button
            type="button"
            onClick={handleThemeToggle}
            className={`rounded-lg p-2 ${dark ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
            aria-label="Toggle theme"
            title="Theme toggle"
          >
            {dark ? <Moon className="h-5 w-5 text-slate-300" /> : <Sun className="h-5 w-5 text-slate-600" />}
          </button>

          <div className="relative">
            <UserDropdown name={userName} avatar={userAvatar} dark={dark} />
          </div>
        </div>
      </div>

    </header>
  )
}