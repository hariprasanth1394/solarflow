import { supabase } from "../lib/supabaseClient"
import { Database } from "../types/database.types"
import { handleRepositoryError } from "./repositoryUtils"
import { assertValidUUID } from "../utils/validateUUID"

type SpareInsert = Database["public"]["Tables"]["spares"]["Insert"]
type SpareUpdate = Database["public"]["Tables"]["spares"]["Update"]

export async function querySpares(
  organizationId: string,
  params: {
    search?: string
    page?: number
    pageSize?: number
    availability?: "all" | "in_stock" | "out_of_stock"
    supplierId?: string
    category?: string
  } = {}
) {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 10))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("spares")
    .select("id,name,category,unit,stock_quantity,min_stock,cost_price,supplier_id,suppliers(name)", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,category.ilike.%${params.search}%`)
  }

  if (params.supplierId) {
    query = query.eq("supplier_id", params.supplierId)
  }

  if (params.category) {
    query = query.ilike("category", `%${params.category}%`)
  }

  if (params.availability === "in_stock") {
    query = query.gt("stock_quantity", 0)
  }

  if (params.availability === "out_of_stock") {
    query = query.eq("stock_quantity", 0)
  }

  const response = await query.range(from, to)
  if (response.error) {
    handleRepositoryError("spareRepository", "querySpares", response.error)
  }
  return response
}

export async function insertSpare(organizationId: string, payload: Omit<SpareInsert, "organization_id">) {
  const response = await supabase
    .from("spares")
    .insert({ ...payload, organization_id: organizationId } as SpareInsert)
    .select("id,name,category,unit,stock_quantity,min_stock,cost_price,supplier_id")
    .single()

  if (response.error) {
    handleRepositoryError("spareRepository", "insertSpare", response.error)
  }

  return response
}

export async function updateSpareById(id: string, organizationId: string, payload: SpareUpdate) {
  assertValidUUID(id, "spareId")
  assertValidUUID(organizationId, "organizationId")
  
  const response = await supabase
    .from("spares")
    .update(payload)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select("id,name,category,unit,stock_quantity,min_stock,cost_price,supplier_id")
    .single()

  if (response.error) {
    handleRepositoryError("spareRepository", "updateSpareById", response.error)
  }

  return response
}

export async function updateSpareStockById(id: string, organizationId: string, stockQuantity: number) {
  assertValidUUID(id, "spareId")
  assertValidUUID(organizationId, "organizationId")
  
  const response = await supabase
    .from("spares")
    .update({ stock_quantity: stockQuantity })
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select("id,name,stock_quantity,min_stock")
    .single()

  if (response.error) {
    handleRepositoryError("spareRepository", "updateSpareStockById", response.error)
  }

  return response
}

export async function querySuppliers(organizationId: string) {
  const response = await supabase
    .from("suppliers")
    .select("id,name")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true })
    .limit(200)

  if (response.error) {
    handleRepositoryError("spareRepository", "querySuppliers", response.error)
  }

  return response
}
