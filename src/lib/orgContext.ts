import { supabase } from "./supabaseClient"
import { validateUUID } from "../utils/validateUUID"

export type RequestContext = {
  organizationId: string
  userId: string
}

const REQUEST_CONTEXT_CACHE_TTL_MS = 2000

let cachedRequestContext: { value: RequestContext; expiresAt: number } | null = null
let inflightRequestContext: Promise<RequestContext> | null = null

async function resolveRequestContext(): Promise<RequestContext> {

  const { data: userData, error } = await supabase.auth.getUser()

  if (error || !userData.user) {
    throw new Error("User not authenticated")
  }

  // Validate user ID is a valid UUID
  if (!validateUUID(userData.user.id)) {
    throw new Error(`Invalid user ID from auth: ${userData.user.id}`)
  }

  const { data, error: userError } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", userData.user.id)
    .single()

  if (userError) {
    throw userError
  }

  return {
    organizationId: data.organization_id,
    userId: userData.user.id
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