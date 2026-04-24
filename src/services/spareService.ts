import { deleteSpareById, insertSpare, querySpares, querySuppliers, updateSpareById, updateSpareStockById } from "../repositories/spareRepository"
import { Database } from "../types/database.types"
import { logError, logInfo } from "../utils/logger"
import { withOrganizationContext } from "../utils/withOrganizationContext"
import { assertValidUUID } from "../utils/validateUUID"
import { logActivity } from "./activityLogService"

type SpareInsert = Database["public"]["Tables"]["spares"]["Insert"]
type SpareUpdate = Database["public"]["Tables"]["spares"]["Update"]

const SUPPLIER_CACHE_TTL_MS = 60_000
const supplierCache = new Map<string, { expiresAt: number; data: Array<{ id: string; name: string }> }>()

export async function getSpares(
  params: {
    search?: string
    page?: number
    pageSize?: number
    availability?: "all" | "in_stock" | "out_of_stock"
    supplierId?: string
    category?: string
  } = {}
) {
  return withOrganizationContext(async (organizationId) => {
    try {
      const { data, error, count } = await querySpares(organizationId, params)
      logInfo("Spares fetched", { service: "spareService", organizationId, count: count ?? 0 })
      return { data: data ?? [], error, count: count ?? 0 }
    } catch (error) {
      logError("Spares fetch failed", error, { service: "spareService", organizationId })
      throw new Error("Operation failed")
    }
  })
}

export async function getSuppliers() {
  return withOrganizationContext(async (organizationId) => {
    try {
      const cached = supplierCache.get(organizationId)
      if (cached && cached.expiresAt > Date.now()) {
        return { data: cached.data, error: null }
      }

      const { data, error } = await querySuppliers(organizationId)
      if (!error) {
        supplierCache.set(organizationId, {
          data: (data ?? []) as Array<{ id: string; name: string }>,
          expiresAt: Date.now() + SUPPLIER_CACHE_TTL_MS
        })
      }

      logInfo("Suppliers fetched", { service: "spareService", organizationId, count: data?.length ?? 0 })
      return { data: data ?? [], error }
    } catch (error) {
      logError("Suppliers fetch failed", error, { service: "spareService", organizationId })
      throw new Error("Operation failed")
    }
  })
}

export async function createSpare(payload: Omit<SpareInsert, "organization_id">) {
  if (!payload?.name?.trim()) {
    throw new Error("Operation failed")
  }

  return withOrganizationContext(async (organizationId) => {
    try {
      const { data, error } = await insertSpare(organizationId, payload)
      if (!error && data) {
        supplierCache.delete(organizationId)
        await logActivity("Inventory updated", "spare", data.id, { action: "create", name: data.name })
      }
      logInfo("Spare created", { service: "spareService", organizationId, spareId: data?.id ?? null })
      return { data, error }
    } catch (error) {
      logError("Spare create failed", error, { service: "spareService", organizationId })
      throw new Error("Operation failed")
    }
  })
}

export async function updateSpare(id: string, payload: SpareUpdate) {
  assertValidUUID(id, "spareId")

  return withOrganizationContext(async (organizationId) => {
    try {
      const { data, error } = await updateSpareById(id, organizationId, payload)
      logInfo("Spare updated", { service: "spareService", organizationId, spareId: id })
      return { data, error }
    } catch (error) {
      logError("Spare update failed", error, { service: "spareService", organizationId, spareId: id })
      throw new Error("Operation failed")
    }
  })
}

export async function updateSpareStock(id: string, stockQuantity: number) {
  assertValidUUID(id, "spareId")
  if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
    throw new Error("Operation failed")
  }

  return withOrganizationContext(async (organizationId) => {
    try {
      const { data, error } = await updateSpareStockById(id, organizationId, stockQuantity)
      if (!error && data) {
        await logActivity("Inventory updated", "spare", id, { action: "stock_update", stockQuantity })
      }
      logInfo("Spare stock updated", { service: "spareService", organizationId, spareId: id, stockQuantity })
      return { data, error }
    } catch (error) {
      logError("Spare stock update failed", error, { service: "spareService", organizationId, spareId: id })
      throw new Error("Operation failed")
    }
  })
}

export async function deleteSpare(id: string) {
  assertValidUUID(id, "spareId")

  return withOrganizationContext(async (organizationId) => {
    try {
      const { error } = await deleteSpareById(id, organizationId)
      if (!error) {
        await logActivity("Inventory updated", "spare", id, { action: "delete" })
      }
      logInfo("Spare deleted", { service: "spareService", organizationId, spareId: id })
      return { error }
    } catch (error) {
      logError("Spare delete failed", error, { service: "spareService", organizationId, spareId: id })
      throw new Error("Operation failed")
    }
  })
}
