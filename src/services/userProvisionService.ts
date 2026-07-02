import { supabase } from "@/lib/supabaseClient"
import {
  getProvisionBlockMessage,
  normalizeRole,
  type PermissionKey,
  type UserRole,
  type UserStatus,
} from "@/lib/rbac/roles"
import type { AppUserProfile, ProvisionResult } from "@/lib/rbac/types"

type RawProfile = {
  id?: string
  auth_user_id?: string | null
  organization_id?: string
  organization_name?: string | null
  email?: string
  full_name?: string | null
  role?: string
  status?: string
  is_active?: boolean
  avatar_url?: string | null
  last_login_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type ValidateRpcResult = {
  allowed?: boolean
  reason?: string
  user_id?: string
  organization_id?: string
  role?: string
  email?: string
  full_name?: string | null
  status?: string
}

function mapProfile(raw: RawProfile, customPermissions: PermissionKey[] = []): AppUserProfile | null {
  const role = normalizeRole(raw.role)
  if (!role || !raw.id || !raw.organization_id || !raw.email) return null

  return {
    id: raw.id,
    authUserId: raw.auth_user_id ?? null,
    organizationId: raw.organization_id,
    organizationName: raw.organization_name ?? null,
    email: raw.email,
    fullName: raw.full_name ?? null,
    role,
    status: (raw.status?.toUpperCase() ?? "PENDING") as UserStatus,
    isActive: raw.is_active !== false,
    avatarUrl: raw.avatar_url ?? null,
    lastLoginAt: raw.last_login_at ?? null,
    createdAt: raw.created_at ?? null,
    updatedAt: raw.updated_at ?? null,
    customPermissions,
  }
}

async function loadCustomPermissions(userId: string): Promise<PermissionKey[]> {
  const { data } = await supabase.from("user_permissions").select("permission_key").eq("user_id", userId)

  return (data ?? [])
    .map((row) => row.permission_key)
    .filter((key): key is PermissionKey => typeof key === "string")
}

export async function validateProvisionedAccess(provider: string): Promise<ProvisionResult> {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null

  const { data, error } = await supabase.rpc("validate_and_link_provisioned_user", {
    p_provider: provider,
    p_ip_address: null,
    p_user_agent: userAgent,
  })

  if (error) {
    return {
      allowed: false,
      reason: "VALIDATION_FAILED",
      message: getProvisionBlockMessage("NOT_PROVISIONED"),
    }
  }

  const result = (data ?? {}) as ValidateRpcResult

  if (!result.allowed) {
    return {
      allowed: false,
      reason: result.reason ?? "ACCESS_DENIED",
      message: getProvisionBlockMessage(result.reason),
    }
  }

  const userId = result.user_id
  if (!userId) {
    return {
      allowed: false,
      reason: "NOT_PROVISIONED",
      message: getProvisionBlockMessage("NOT_PROVISIONED"),
    }
  }

  const customPermissions = await loadCustomPermissions(userId)
  const profile = mapProfile(
    {
      id: userId,
      organization_id: result.organization_id,
      email: result.email,
      full_name: result.full_name,
      role: result.role,
      status: result.status,
      is_active: true,
    },
    customPermissions
  )

  if (!profile) {
    return {
      allowed: false,
      reason: "INVALID_PROFILE",
      message: getProvisionBlockMessage("NOT_PROVISIONED"),
    }
  }

  return { allowed: true, profile }
}

export async function fetchMyProfile(): Promise<AppUserProfile | null> {
  const { data, error } = await supabase.rpc("get_my_profile")
  if (error || !data) return null

  const raw = data as RawProfile
  if (!raw.id) return null

  const customPermissions = await loadCustomPermissions(raw.id)
  return mapProfile(raw, customPermissions)
}

export async function logAuthEvent(
  eventType: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "ACCESS_DENIED" | "LOGOUT",
  options: {
    email?: string | null
    provider?: string | null
    userId?: string | null
    metadata?: Record<string, unknown>
  } = {}
) {
  await supabase.rpc("log_auth_event", {
    p_event_type: eventType,
    p_email: options.email ?? null,
    p_provider: options.provider ?? null,
    p_user_id: options.userId ?? null,
    p_ip_address: null,
    p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    p_metadata: (options.metadata ?? {}) as import("@/types/database.types").Json,
  })
}

export async function denyUnprovisionedSession(provider: string, reason: string) {
  await logAuthEvent("ACCESS_DENIED", { provider, metadata: { reason } })
  await supabase.auth.signOut()
}
