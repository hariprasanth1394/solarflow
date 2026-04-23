import { supabase } from "../lib/supabaseClient"
import { handleRepositoryError } from "./repositoryUtils"
import { Database } from "../types/database.types"
import { assertValidUUID } from "../utils/validateUUID"

type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"]
type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"]

const CUSTOMER_WRITE_RETURN_COLUMNS = "id,name,phone,email,company,address,city,state,country,assigned_to,status,system_id,notes,created_at"
const CUSTOMER_SELECT_WITH_STAGE = "id,name,phone,email,company,address,city,state,country,assigned_to,status,current_stage,system_id,notes,created_at"
const CUSTOMER_SELECT_LEGACY = "id,name,phone,email,company,address,city,state,country,assigned_to,status,system_id,notes,created_at"

let hasCurrentStageColumn: boolean | null = null

function isMissingCurrentStageColumn(error: { code?: string; message?: string; details?: string; hint?: string } | null) {
  if (!error) return false
  if (error.code === "42703") return true

  const combined = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase()
  return combined.includes("current_stage")
}

export async function fetchCustomers(
  orgId: string,
  options?: { search?: string; status?: string; page?: number; pageSize?: number }
) {
  const applyStatusFilter = (query: any, selectColumns: string) => {
    if (!options?.status || options.status === "All") return query

    const normalized = options.status.toUpperCase().trim()
    const hasStageColumnInQuery = selectColumns.includes("current_stage")

    if (hasStageColumnInQuery) {
      if (normalized === "CREATED") return query.eq("current_stage", "CREATED")
      if (normalized === "GOVERNMENT_APPROVAL") return query.in("current_stage", ["SUBMITTED", "APPROVED"])
      if (normalized === "INSTALLATION") return query.eq("current_stage", "INSTALLATION")
      if (normalized === "CLOSED" || normalized === "CLOSURE") return query.eq("current_stage", "CLOSED")
      return query.eq("status", options.status)
    }

    if (normalized === "CREATED") return query.ilike("status", "%created%")
    if (normalized === "GOVERNMENT_APPROVAL") {
      return query.or("status.ilike.%approval%,status.ilike.%submit%,status.ilike.%gov%")
    }
    if (normalized === "INSTALLATION") return query.or("status.ilike.%install%,status.ilike.%progress%")
    if (normalized === "CLOSED" || normalized === "CLOSURE") {
      return query.or("status.ilike.%closed%,status.ilike.%completed%,status.ilike.%inactive%")
    }

    return query.eq("status", options.status)
  }

  const buildQuery = (selectColumns: string) => {
    let query = supabase.from("customers").select(selectColumns, { count: "exact" }).eq("organization_id", orgId)

    if (options?.search) {
      query = query.or(
        `name.ilike.%${options.search}%,email.ilike.%${options.search}%,company.ilike.%${options.search}%,phone.ilike.%${options.search}%`
      )
    }

    query = applyStatusFilter(query, selectColumns)

    const page = Math.max(1, options?.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 20))
    const offset = (page - 1) * pageSize
    return query.range(offset, offset + pageSize - 1).order("created_at", { ascending: false })
  }

  const primarySelect = hasCurrentStageColumn === false ? CUSTOMER_SELECT_LEGACY : CUSTOMER_SELECT_WITH_STAGE
  const primary = await buildQuery(primarySelect)

  if (!primary.error) {
    if (primarySelect === CUSTOMER_SELECT_WITH_STAGE) {
      hasCurrentStageColumn = true
    }
    return { data: primary.data, count: primary.count || 0 }
  }

  if (isMissingCurrentStageColumn(primary.error)) {
    hasCurrentStageColumn = false
    const legacy = await buildQuery(CUSTOMER_SELECT_LEGACY)
    if (legacy.error) handleRepositoryError("customerRepository", "fetchCustomers", legacy.error)
    return { data: legacy.data, count: legacy.count || 0 }
  }

  handleRepositoryError("customerRepository", "fetchCustomers", primary.error)
}

export async function insertCustomer(orgId: string, payload: Omit<CustomerInsert, "organization_id">) {
  const { data, error } = await supabase
    .from("customers")
    .insert({ ...payload, organization_id: orgId } as CustomerInsert)
    .select(CUSTOMER_WRITE_RETURN_COLUMNS)
    .single()

  if (error) handleRepositoryError("customerRepository", "insertCustomer", error)
  return data
}

export async function updateCustomerById(id: string, orgId: string, payload: CustomerUpdate) {
  assertValidUUID(id, "customerId")
  assertValidUUID(orgId, "organizationId")
  
  const { data, error } = await supabase
    .from("customers")
    .update(payload)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select(CUSTOMER_WRITE_RETURN_COLUMNS)
    .single()

  if (error) handleRepositoryError("customerRepository", "updateCustomerById", error)
  return data
}

export async function fetchCustomerById(id: string, orgId: string) {
  assertValidUUID(id, "customerId")
  assertValidUUID(orgId, "organizationId")
  
  const withStage = await supabase
    .from("customers")
    .select(hasCurrentStageColumn === false ? CUSTOMER_SELECT_LEGACY : CUSTOMER_SELECT_WITH_STAGE)
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle()

  if (!withStage.error) {
    if (hasCurrentStageColumn !== false) {
      hasCurrentStageColumn = true
    }
    return withStage.data
  }

  if (isMissingCurrentStageColumn(withStage.error)) {
    hasCurrentStageColumn = false
    const legacy = await supabase
      .from("customers")
      .select(CUSTOMER_SELECT_LEGACY)
      .eq("id", id)
      .eq("organization_id", orgId)
      .maybeSingle()

    if (legacy.error) handleRepositoryError("customerRepository", "fetchCustomerById", legacy.error)
    return legacy.data
  }

  handleRepositoryError("customerRepository", "fetchCustomerById", withStage.error)
}

export async function deleteCustomerById(id: string, orgId: string) {
  assertValidUUID(id, "customerId")
  assertValidUUID(orgId, "organizationId")
  
  const { error } = await supabase.from("customers").delete().eq("id", id).eq("organization_id", orgId)
  if (error) handleRepositoryError("customerRepository", "deleteCustomerById", error)
}

export async function fetchAssignableUsers(orgId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id,name,email")
    .eq("organization_id", orgId)
    .order("name", { ascending: true })

  if (error) handleRepositoryError("customerRepository", "fetchAssignableUsers", error)
  return data ?? []
}
