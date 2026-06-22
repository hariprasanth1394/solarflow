import { supabase } from "@/lib/supabaseClient"
import type { UserRole, UserStatus } from "@/lib/rbac/roles"

export type ManagedUser = {
  id: string
  email: string
  fullName: string | null
  role: UserRole
  status: UserStatus
  isActive: boolean
  authUserId: string | null
  lastLoginAt: string | null
  createdAt: string
}

export type CreateManagedUserInput = {
  email: string
  fullName: string
  role: UserRole
  status?: UserStatus
}

export async function listManagedUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, name, role, status, is_active, auth_user_id, last_login_at, created_at")
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email ?? "",
    fullName: row.full_name ?? row.name,
    role: row.role as UserRole,
    status: row.status as UserStatus,
    isActive: row.is_active ?? false,
    authUserId: row.auth_user_id,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  })) satisfies ManagedUser[]
}

export async function createManagedUser(input: CreateManagedUserInput) {
  const { data: authData } = await supabase.auth.getUser()
  const creatorAuthId = authData.user?.id

  let createdBy: string | null = null
  if (creatorAuthId) {
    const { data: creator } = await supabase.from("users").select("id").eq("auth_user_id", creatorAuthId).maybeSingle()
    createdBy = creator?.id ?? null
  }

  const { data: orgId, error: orgError } = await supabase.rpc("current_user_org_id")
  if (orgError || !orgId) throw orgError ?? new Error("Organization not found")

  const { data, error } = await supabase
    .from("users")
    .insert({
      email: input.email.trim().toLowerCase(),
      full_name: input.fullName.trim(),
      name: input.fullName.trim(),
      role: input.role,
      status: input.status ?? "PENDING",
      is_active: (input.status ?? "PENDING") === "ACTIVE",
      organization_id: orgId,
      created_by: createdBy,
    })
    .select("id, email, full_name, role, status, is_active")
    .single()

  if (error) throw error
  return data
}

export async function updateManagedUser(
  userId: string,
  patch: Partial<Pick<CreateManagedUserInput, "fullName" | "role" | "status">>
) {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.fullName !== undefined) {
    payload.full_name = patch.fullName
    payload.name = patch.fullName
  }
  if (patch.role !== undefined) payload.role = patch.role
  if (patch.status !== undefined) {
    payload.status = patch.status
    payload.is_active = patch.status === "ACTIVE"
  }

  const { data, error } = await supabase.from("users").update(payload).eq("id", userId).select("id").single()
  if (error) throw error
  return data
}
