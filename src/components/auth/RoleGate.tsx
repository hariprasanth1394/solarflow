"use client"

import type { ReactNode } from "react"
import { useAuthContext } from "@/contexts/AuthContext"
import { roleHasPermission, type PermissionKey, type UserRole } from "@/lib/rbac/roles"

type RoleGateProps = {
  children: ReactNode
  minimumRole?: UserRole
  permission?: PermissionKey
  fallback?: ReactNode
}

const ROLE_RANK: Record<UserRole, number> = {
  VIEWER: 1,
  TECHNICIAN: 2,
  MANAGER: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
}

export default function RoleGate({ children, minimumRole, permission, fallback = null }: RoleGateProps) {
  const { profile, hasPermission } = useAuthContext()

  if (!profile) return <>{fallback}</>

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>
  }

  if (minimumRole && ROLE_RANK[profile.role] < ROLE_RANK[minimumRole]) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export function usePermission(permission: PermissionKey) {
  const { profile } = useAuthContext()
  if (!profile) return false
  return roleHasPermission(profile.role, permission, profile.customPermissions)
}
