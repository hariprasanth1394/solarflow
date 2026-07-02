import type { UserRole, UserStatus, PermissionKey } from "./roles"

export type AppUserProfile = {
  id: string
  authUserId: string | null
  organizationId: string
  organizationName: string | null
  email: string
  fullName: string | null
  role: UserRole
  status: UserStatus
  isActive: boolean
  avatarUrl: string | null
  lastLoginAt: string | null
  createdAt: string | null
  updatedAt: string | null
  customPermissions: PermissionKey[]
}

export type ProvisionResult =
  | { allowed: true; profile: AppUserProfile }
  | { allowed: false; reason: string; message: string }
