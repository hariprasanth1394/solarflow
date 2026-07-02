import { supabase } from "../lib/supabaseClient"
import { Database } from "../types/database.types"
import { handleRepositoryError } from "./repositoryUtils"
import { assertValidUUID } from "../utils/validateUUID"

type SystemInsert = Database["public"]["Tables"]["systems"]["Insert"]
type SystemUpdate = Database["public"]["Tables"]["systems"]["Update"]
type SystemComponentInsert = Database["public"]["Tables"]["system_components"]["Insert"]

export async function querySystems(organizationId: string) {
  const response = await supabase
    .from("systems")
    .select("id,system_name,capacity_kw,description,price,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200)

  if (response.error) {
    handleRepositoryError("systemRepository", "querySystems", response.error)
  }

  return response
}

export async function insertSystem(organizationId: string, payload: Omit<SystemInsert, "organization_id">) {
  const response = await supabase
    .from("systems")
    .insert({ ...payload, organization_id: organizationId } as SystemInsert)
    .select("id,system_name,capacity_kw,description,price,created_at")
    .single()

  if (response.error) {
    handleRepositoryError("systemRepository", "insertSystem", response.error)
  }

  return response
}

export async function updateSystemById(
  organizationId: string,
  systemId: string,
  payload: Pick<SystemUpdate, "system_name" | "capacity_kw" | "price">
) {
  assertValidUUID(organizationId, "organizationId")
  assertValidUUID(systemId, "systemId")

  const response = await supabase
    .from("systems")
    .update(payload)
    .eq("id", systemId)
    .eq("organization_id", organizationId)
    .select("id,system_name,capacity_kw,description,price,created_at")
    .single()

  if (response.error) {
    handleRepositoryError("systemRepository", "updateSystemById", response.error)
  }

  return response
}

export async function deleteSystemById(organizationId: string, systemId: string) {
  assertValidUUID(organizationId, "organizationId")
  assertValidUUID(systemId, "systemId")

  const response = await supabase
    .from("systems")
    .delete()
    .eq("id", systemId)
    .eq("organization_id", organizationId)

  if (response.error) {
    handleRepositoryError("systemRepository", "deleteSystemById", response.error)
  }

  return response
}

export async function querySystemComponents(organizationId: string, systemId: string) {
  assertValidUUID(organizationId, "organizationId")
  assertValidUUID(systemId, "systemId")
  
  const response = await supabase
    .from("system_components")
    .select("id,quantity_required,spare_id,spares(name,unit,stock_quantity,min_stock)")
    .eq("organization_id", organizationId)
    .eq("system_id", systemId)
    .order("created_at", { ascending: false })
    .limit(500)

  if (response.error) {
    handleRepositoryError("systemRepository", "querySystemComponents", response.error)
  }

  return response
}

export async function insertSystemComponent(
  organizationId: string,
  payload: Omit<SystemComponentInsert, "organization_id">
) {
  const response = await supabase
    .from("system_components")
    .insert({ ...payload, organization_id: organizationId } as SystemComponentInsert)
    .select("id,quantity_required,spare_id,spares(name,unit,stock_quantity,min_stock)")
    .single()

  if (response.error) {
    handleRepositoryError("systemRepository", "insertSystemComponent", response.error)
  }

  return response
}

export async function deleteSystemComponentById(organizationId: string, componentId: string) {
  assertValidUUID(organizationId, "organizationId")
  assertValidUUID(componentId, "componentId")
  
  const response = await supabase
    .from("system_components")
    .delete()
    .eq("id", componentId)
    .eq("organization_id", organizationId)

  if (response.error) {
    handleRepositoryError("systemRepository", "deleteSystemComponentById", response.error)
  }

  return response
}

export async function querySparesForSystemBuilder(organizationId: string) {
  const response = await supabase
    .from("spares")
    .select("id,name,unit,stock_quantity,min_stock")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true })
    .limit(500)

  if (response.error) {
    handleRepositoryError("systemRepository", "querySparesForSystemBuilder", response.error)
  }

  return response
}
