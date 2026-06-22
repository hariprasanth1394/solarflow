import { supabase } from "./supabaseClient"
import { validateUUID } from "../utils/validateUUID"
import { createClient } from "@supabase/supabase-js"
import { Database } from "../types/database.types"
import { normalizeRole, type UserRole } from "./rbac/roles"

export type RequestContext = {
  organizationId: string
  userId: string
  authUserId: string
  role: UserRole
  email: string | null
}

const REQUEST_CONTEXT_CACHE_TTL_MS = 2000

let cachedRequestContext: { value: RequestContext; expiresAt: number } | null = null
let inflightRequestContext: Promise<RequestContext> | null = null

async function getAccessTokenFromCookies(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    const token = cookieStore.get("sb-access-token")?.value
    return token ? decodeURIComponent(token) : null
  } catch {
    return null
  }
}

function getRequestScopedSupabase(accessToken: string | null) {
  if (!accessToken) return supabase

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabase
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

async function resolveRequestContext(): Promise<RequestContext> {
  const accessToken = await getAccessTokenFromCookies()
  const requestSupabase = getRequestScopedSupabase(accessToken)
  const { data: userData, error } = accessToken
    ? await requestSupabase.auth.getUser(accessToken)
    : await requestSupabase.auth.getUser()

  if (error || !userData.user) {
    throw new Error("User not authenticated")
  }

  if (!validateUUID(userData.user.id)) {
    throw new Error(`Invalid user ID from auth: ${userData.user.id}`)
  }

  const { data, error: userError } = await requestSupabase
    .from("users")
    .select("id, organization_id, role, email, status, is_active")
    .eq("auth_user_id", userData.user.id)
    .limit(1)
    .maybeSingle()

  if (userError) {
    throw userError
  }

  if (!data?.organization_id || !data.id) {
    throw new Error("Provisioned user profile not found")
  }

  const role = normalizeRole(data.role)
  if (!role) {
    throw new Error("Invalid user role")
  }

  if (data.status !== "ACTIVE" || data.is_active === false) {
    throw new Error("User account is not active")
  }

  return {
    organizationId: data.organization_id,
    userId: data.id,
    authUserId: userData.user.id,
    role,
    email: data.email,
  }
}

export async function getRequestContext(): Promise<RequestContext> {
  const now = Date.now()
  if (cachedRequestContext && cachedRequestContext.expiresAt > now) {
    return cachedRequestContext.value
  }

  if (inflightRequestContext) {
    return inflightRequestContext
  }

  inflightRequestContext = resolveRequestContext()
    .then((context) => {
      cachedRequestContext = {
        value: context,
        expiresAt: Date.now() + REQUEST_CONTEXT_CACHE_TTL_MS,
      }
      return context
    })
    .finally(() => {
      inflightRequestContext = null
    })

  return inflightRequestContext
}

export async function getOrganizationContext() {
  const { organizationId } = await getRequestContext()
  return organizationId
}
