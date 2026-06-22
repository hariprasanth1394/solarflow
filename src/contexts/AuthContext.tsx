"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { canAccessRoute, roleHasPermission, type PermissionKey, type UserRole } from "@/lib/rbac/roles"
import type { AppUserProfile } from "@/lib/rbac/types"
import { denyUnprovisionedSession, fetchMyProfile, validateProvisionedAccess } from "@/services/userProvisionService"
import { getCurrentSession } from "@/services/authService"

type AuthContextValue = {
  profile: AppUserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  hasPermission: (permission: PermissionKey) => boolean
  hasRole: (...roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const PUBLIC_PATHS = ["/login", "/auth/callback"]

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [profile, setProfile] = useState<AppUserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    const session = await getCurrentSession()
    if (!session?.user) {
      setProfile(null)
      return
    }

    const nextProfile = await fetchMyProfile()
    setProfile(nextProfile)
  }, [])

  const bootstrap = useCallback(async () => {
    setLoading(true)
    try {
      const session = await getCurrentSession()
      if (!session?.user) {
        setProfile(null)
        return
      }

      const existing = await fetchMyProfile()
      if (existing?.isActive && existing.status === "ACTIVE") {
        setProfile(existing)
        return
      }

      const validation = await validateProvisionedAccess(session.user.app_metadata?.provider ?? "email")
      if (!validation.allowed) {
        await denyUnprovisionedSession("session", validation.reason)
        setProfile(null)
        if (!PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
          router.replace(`/login?error=${encodeURIComponent(validation.message)}`)
        }
        return
      }

      setProfile(validation.profile)
    } finally {
      setLoading(false)
    }
  }, [pathname, router])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setProfile(null)
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void refreshProfile()
      }
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [refreshProfile])

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      loading,
      refreshProfile,
      hasPermission: (permission) => {
        if (!profile) return false
        return roleHasPermission(profile.role, permission, profile.customPermissions)
      },
      hasRole: (...roles) => {
        if (!profile) return false
        return roles.includes(profile.role)
      },
    }),
    [profile, loading, refreshProfile]
  )

  useEffect(() => {
    if (loading || !profile || PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
      return
    }

    if (!canAccessRoute(profile.role, pathname, profile.customPermissions)) {
      router.replace("/dashboard")
    }
  }, [loading, pathname, profile, router])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider")
  }
  return context
}
