import { supabase } from "../lib/supabaseClient"
import type { Database } from "../types/database.types"
import { handleRepositoryError } from "./repositoryUtils"

const legacySupabase = supabase as any

type StockTransactionInsert = Database["public"]["Tables"]["stock_transactions"]["Insert"]
type InventoryMovementInsert = {
  organization_id: string
  customer_id?: string | null
  system_id?: string | null
  spare_id: string
  movement_type: "reserve" | "release" | "consume" | "purchase" | "adjustment"
  quantity: number
  reference?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
  created_by?: string | null
}

export async function getAvailableSolarSystems() {
  const response = await supabase
    .from("v_system_inventory_availability")
    .select("system_id,system_name,capacity_kw,available_systems")
    .gt("available_systems", 0)
    .order("capacity_kw", { ascending: true })
    .limit(200)

  if (response.error) {
    handleRepositoryError("inventoryRepository", "getAvailableSolarSystems", response.error)
  }

  return response
}

export async function querySystemAvailability(organizationId: string) {
  const response = await supabase.rpc("calculate_system_inventory_availability", { p_organization_id: organizationId })
  if (response.error) {
    handleRepositoryError("inventoryRepository", "querySystemAvailability", response.error)
  }
  return response
}

export async function queryInventoryDashboard(organizationId: string) {
  const [sparesResponse, lowStockResponse, systemsResponse, availableSystemsResponse] = await Promise.all([
    supabase.from("spares").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("spares").select("id,stock_quantity,min_stock").eq("organization_id", organizationId).limit(500),
    supabase.from("systems").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.rpc("calculate_system_inventory_availability", { p_organization_id: organizationId })
  ])

  if (sparesResponse.error) handleRepositoryError("inventoryRepository", "queryInventoryDashboard.spares", sparesResponse.error)
  if (lowStockResponse.error) handleRepositoryError("inventoryRepository", "queryInventoryDashboard.lowStock", lowStockResponse.error)
  if (systemsResponse.error) handleRepositoryError("inventoryRepository", "queryInventoryDashboard.systems", systemsResponse.error)
  if (availableSystemsResponse.error)
    handleRepositoryError("inventoryRepository", "queryInventoryDashboard.availableSystems", availableSystemsResponse.error)

  return {
    sparesResponse,
    lowStockResponse,
    systemsResponse,
    availableSystemsResponse
  }
}

export async function queryStockAlerts(organizationId: string) {
  const response = await supabase
    .from("spares")
    .select("id,name,stock_quantity,min_stock,unit")
    .eq("organization_id", organizationId)
    .order("stock_quantity", { ascending: true })
    .limit(200)

  if (response.error) {
    handleRepositoryError("inventoryRepository", "queryStockAlerts", response.error)
  }

  return response
}

export async function queryStockTransactions(organizationId: string) {
  const response = await supabase
    .from("stock_transactions")
    .select("id,type,quantity,reference,created_at,spare_id,spares(name,unit)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100)

  if (response.error) {
    handleRepositoryError("inventoryRepository", "queryStockTransactions", response.error)
  }

  return response
}

export async function querySuppliers(organizationId: string) {
  const response = await supabase
    .from("suppliers")
    .select("id,name,contact,email,phone,created_at")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true })
    .limit(200)

  if (response.error) {
    handleRepositoryError("inventoryRepository", "querySuppliers", response.error)
  }

  return response
}

export async function queryComponentUsage(organizationId: string) {
  const response = await supabase
    .from("system_components")
    .select("id,quantity_required,spares(name,unit),systems(system_name,capacity_kw)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200)

  if (response.error) {
    handleRepositoryError("inventoryRepository", "queryComponentUsage", response.error)
  }

  return response
}

export async function querySystemComponentsBySystemId(organizationId: string, systemId: string) {
  const response = await supabase
    .from("system_components")
    .select("id,spare_id,quantity_required,spares(id,name,category,stock_quantity)")
    .eq("organization_id", organizationId)
    .eq("system_id", systemId)

  if (response.error) {
    handleRepositoryError("inventoryRepository", "querySystemComponentsBySystemId", response.error)
  }

  return response
}

export async function queryStockTransactionsByReferences(organizationId: string, references: string[]) {
  if (references.length === 0) return { data: [], error: null }

  const response = await supabase
    .from("stock_transactions")
    .select("id,reference,type,quantity,spare_id,created_at")
    .eq("organization_id", organizationId)
    .in("reference", references)

  if (response.error) {
    handleRepositoryError("inventoryRepository", "queryStockTransactionsByReferences", response.error)
  }

  return response
}

export async function queryInventoryMovementsByReferences(organizationId: string, references: string[]) {
  if (references.length === 0) return { data: [], error: null }

  const response = await legacySupabase
    .from("inventory_movements")
    .select("id,reference,movement_type,quantity,spare_id,customer_id,system_id,created_at")
    .eq("organization_id", organizationId)
    .in("reference", references)

  if (response.error) {
    handleRepositoryError("inventoryRepository", "queryInventoryMovementsByReferences", response.error)
  }

  return response
}

export async function insertStockTransactions(organizationId: string, rows: Array<Omit<StockTransactionInsert, "organization_id">>) {
  if (rows.length === 0) return { data: [], error: null }

  const payload = rows.map((row) => ({
    ...row,
    organization_id: organizationId
  })) as StockTransactionInsert[]

  const response = await supabase
    .from("stock_transactions")
    .insert(payload)
    .select("id,reference,type,quantity,spare_id,created_at")

  if (response.error) {
    handleRepositoryError("inventoryRepository", "insertStockTransactions", response.error)
  }

  return response
}

export async function insertInventoryMovements(
  organizationId: string,
  rows: Array<Omit<InventoryMovementInsert, "organization_id">>
) {
  if (rows.length === 0) return { data: [], error: null }

  const payload = rows.map((row) => ({
    ...row,
    organization_id: organizationId,
    metadata: row.metadata ?? {}
  }))

  const response = await legacySupabase
    .from("inventory_movements")
    .insert(payload)
    .select("id,reference,movement_type,quantity,spare_id,customer_id,system_id,created_at")

  if (response.error) {
    handleRepositoryError("inventoryRepository", "insertInventoryMovements", response.error)
  }

  return response
}

export async function queryInventoryMovements(organizationId: string, limit = 5000) {
  const response = await legacySupabase
    .from("inventory_movements")
    .select("id,spare_id,movement_type,quantity,reference,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(Math.min(5000, Math.max(1, limit)))

  if (response.error) {
    handleRepositoryError("inventoryRepository", "queryInventoryMovements", response.error)
  }

  return response
}

export async function queryInventorySpareSummary(organizationId: string) {
  const [sparesResponse, movementsResponse] = await Promise.all([
    supabase
      .from("spares")
      .select("id,name,category,stock_quantity,created_at")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true })
      .limit(1000),
    legacySupabase
      .from("inventory_movements")
      .select("id,spare_id,movement_type,quantity,reference,created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(5000)
  ])

  if (sparesResponse.error) {
    handleRepositoryError("inventoryRepository", "queryInventorySpareSummary.spares", sparesResponse.error)
  }

  if (movementsResponse.error) {
    handleRepositoryError("inventoryRepository", "queryInventorySpareSummary.movements", movementsResponse.error)
  }

  return {
    sparesResponse,
    movementsResponse
  }
}
