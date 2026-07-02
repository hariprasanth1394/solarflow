"use client"

import { LogOut, User } from "lucide-react"
import Link from "next/link"
import { useRef, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { logout } from "@/services/authService"
import Avatar from "./Avatar"

type UserDropdownProps = {
  name: string
  avatar?: string | null
  initials?: string
}

export default function UserDropdown({ name, avatar, initials }: UserDropdownProps) {
  const [open, setOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [error, setError] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()

  const initialsLabel = initials || name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscapeKey)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscapeKey)
    }
  }, [open])

  const handleLogout = async () => {
    if (isLoggingOut) return
    setError("")
    setIsLoggingOut(true)

    try {
      await logout()
      setOpen(false)
      router.replace("/login")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log out")
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 transition-all duration-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 ${
          open ? "bg-slate-100 dark:bg-slate-800" : ""
        }`}
        aria-label="User menu"
      >
        <Avatar src={avatar} initials={initialsLabel} size="sm" />
        <span className="hidden text-sm font-semibold md:inline">{name.split(" ")[0]}</span>
      </button>

      {open ? (
        <div
          ref={dropdownRef}
          className="user-dropdown absolute right-0 z-[var(--sf-z-dropdown)] animate-[dropdownFade_0.16s_ease]"
          role="menu"
        >
          <div className="user-dropdown-header">
            <p>{name}</p>
            <p>Account</p>
          </div>

          <nav className="user-dropdown-nav">
            <Link
              href="/settings/profile"
              onClick={() => setOpen(false)}
              className="user-dropdown-item"
              role="menuitem"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="user-dropdown-item"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? "Signing out..." : "Logout"}
            </button>
          </nav>

          {error ? (
            <div className="border-t border-[var(--border)] px-4 py-2.5 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
