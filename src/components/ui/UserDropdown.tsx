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
  dark?: boolean
}

export default function UserDropdown({ name, avatar, dark = false }: UserDropdownProps) {
  const [open, setOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [error, setError] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()

  // Extract initials
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  // Handle outside click
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
      console.log("Signing out...")
      await logout()
      console.log("Redirecting to login")
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
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200 ${
          dark
            ? "border border-slate-700 hover:bg-slate-800"
            : "border border-slate-200 hover:bg-slate-50"
        } ${open ? (dark ? "bg-slate-800" : "bg-slate-100") : ""}`}
        aria-label="User menu"
      >
        <Avatar src={avatar} initials={initials} size="sm" />
        <span className="hidden text-sm font-semibold md:inline">{name.split(" ")[0]}</span>
      </button>

      {/* Dropdown Menu */}
      {open ? (
        <div
          ref={dropdownRef}
          className={`user-dropdown absolute right-0 top-11 z-50 w-48 animate-[fadeIn_0.15s_ease-out] rounded-lg shadow-[0_16px_48px_-12px_rgba(15,23,42,0.20)] ring-1 ${
            dark
              ? "border-slate-700 bg-slate-800 text-slate-100"
              : "border-slate-200 bg-white text-slate-900"
          } ring-slate-200/50 dark:ring-slate-700/50`}
        >
          {/* User Info Header */}
          <div className={`border-b px-4 py-3 ${dark ? "border-slate-700" : "border-slate-100"}`}>
            <p className="text-sm font-semibold">{name}</p>
            <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>Account</p>
          </div>

          {/* Menu Items */}
          <nav className="p-1">
            <Link
              href="/settings/profile"
              onClick={() => setOpen(false)}
              className={`user-dropdown-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                dark
                  ? "text-slate-100 hover:bg-slate-700"
                  : "text-slate-900 hover:bg-slate-100"
              }`}
            >
              <User className="h-4 w-4" />
              Profile
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`user-dropdown-item w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                dark
                  ? "text-slate-100 hover:bg-slate-700"
                  : "text-slate-900 hover:bg-slate-100"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? "Signing out..." : "Logout"}
            </button>
          </nav>

          {/* Error Message */}
          {error ? (
            <div className={`border-t px-4 py-2.5 text-xs ${
              dark
                ? "border-slate-700 text-rose-400"
                : "border-slate-100 text-rose-600"
            }`}>
              {error}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
