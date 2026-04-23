import { supabase } from "./supabaseClient"
import { validateUUID } from "../utils/validateUUID"
import { createClient } from "@supabase/supabase-js"
import { Database } from "../types/database.types"

export type RequestContext = {
  organizationId: string
  userId: string
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
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
}

async function resolveRequestContext(): Promise<RequestContext> {
  try {
    const accessToken = await getAccessTokenFromCookies()
    const requestSupabase = getRequestScopedSupabase(accessToken)
    const { data: userData, error } = accessToken
      ? await requestSupabase.auth.getUser(accessToken)
      : await requestSupabase.auth.getUser()

    if (error || !userData.user) {
      throw new Error("User not authenticated")
    }

  // Validate user ID is a valid UUID
  if (!validateUUID(userData.user.id)) {
    throw new Error(`Invalid user ID from auth: ${userData.user.id}`)
  }

  const { data, error: userError } = await requestSupabase
    .from("users")
    .select("organization_id")
    .eq("id", userData.user.id)
    .limit(1)
    .maybeSingle()

    if (userError) {
      throw userError
    }

    let organizationId = data?.organization_id || null

    if (!organizationId) {
      const { data: orgIdFromRpc, error: rpcError } = await (requestSupabase as any).rpc("current_user_org_id")
      if (rpcError) {
        throw rpcError
      }

      if (typeof orgIdFromRpc === "string" && orgIdFromRpc.trim()) {
        organizationId = orgIdFromRpc
      }
    }

    if (!organizationId) {
      throw new Error("User organization not found")
    }

    return {
      organizationId,
      userId: userData.user.id
    }
  } catch (error) {
    // Silently handle auth errors during initial load
    // This can happen when user is not logged in
    throw error
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
        expiresAt: Date.now() + REQUEST_CONTEXT_CACHE_TTL_MS
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