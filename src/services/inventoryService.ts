import {
  getAvailableSolarSystems as fetchAvailableSolarSystems,
  queryComponentUsage,
  queryInventoryDashboard,
  queryInventoryMovements,
  queryInventorySpareSummary,
  queryStockAlerts,
  queryStockTransactions,
  querySuppliers,
  querySystemAvailability
} from "../repositories/inventoryRepository"
import { getOrSetQueryCache } from "../lib/queryCache"
import { elapsedMs, logError, logInfo, startTimer } from "../utils/logger"
import { withRequestContext } from "../utils/withRequestContext"

const INVENTORY_METRICS_CACHE_TTL_MS = 20_000
const STOCK_ALERTS_CACHE_TTL_MS = 15_000
const AVAILABLE_SYSTEMS_CACHE_TTL_MS = 30_000

export type AvailableSolarSystem = {
  system_id: string | null
  system_name: string | null
  capacity_kw: number | null
  available_systems: number | null
}

export async function getAvailableSolarSystems() {
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error } = await getOrSetQueryCache(
        `inventory:available-systems:${organizationId}`,
        AVAILABLE_SYSTEMS_CACHE_TTL_MS,
        () => fetchAvailableSolarSystems()
      )

      logInfo("Available solar systems fetched", {
        service: "inventoryService",
        organizationId,
        userId,
        count: data?.length ?? 0
      })

      return { data: (data ?? []) as AvailableSolarSystem[], error }
    } catch (error) {
      logError("Available solar systems fetch failed", error, { service: "inventoryService", organizationId, userId })
      throw new Error("Operation failed")
    }
  })
}

export async function getSystemAvailability() {
  const startedAt = startTimer()
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error } = await querySystemAvailability(organizationId)
      logInfo("System availability fetched", {
        service: "inventoryService",
        organizationId,
        userId,
        count: data?.length ?? 0,
        durationMs: elapsedMs(startedAt)
      })
      return { data: data ?? [], error }
    } catch (error) {
      logError("System availability fetch failed", error, {
        service: "inventoryService",
        organizationId,
        userId,
        durationMs: elapsedMs(startedAt)
      })
      throw new Error("Operation failed")
    }
  })
}

export async function getInventoryDashboardMetrics() {
  const startedAt = startTimer()
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { sparesResponse, lowStockResponse, systemsResponse, availableSystemsResponse } = await getOrSetQueryCache(
        `inventory:dashboard:${organizationId}`,
        INVENTORY_METRICS_CACHE_TTL_MS,
        () => queryInventoryDashboard(organizationId)
      )

      const availableSystems = (availableSystemsResponse.data ?? []).reduce((sum, row) => {
        return sum + (row.available_systems ?? 0)
      }, 0)

      const reserveTransactions = ((await queryInventoryMovements(organizationId, 5000)).data ?? []) as Array<{
        reference?: string | null
      }>
      const activeReservedCustomers = new Set<string>()
      reserveTransactions.forEach((row) => {
        const reference = (row.reference ?? "").trim()
        if (!reference) return
        if (reference.startsWith("reserve:")) {
          const customerId = reference.split(":")[1]
          if (customerId) activeReservedCustomers.add(customerId)
        }
        if (reference.startsWith("consume:") || reference.startsWith("release:")) {
          const customerId = reference.split(":")[1]
          if (customerId) activeReservedCustomers.delete(customerId)
        }
      })

      const lowStockItems = (lowStockResponse.data ?? []).filter((row) => row.stock_quantity <= row.min_stock).length

      const data = {
        totalSpareParts: sparesResponse.count ?? 0,
        lowStockItems,
        totalSystems: systemsResponse.count ?? 0,
        availableSystems,
        reservedSystems: activeReservedCustomers.size
      }

      logInfo("Inventory dashboard metrics fetched", {
        service: "inventoryService",
        organizationId,
        userId,
        durationMs: elapsedMs(startedAt),
        totals: data
      })

      return {
        data,
        error: sparesResponse.error || lowStockResponse.error || systemsResponse.error || availableSystemsResponse.error
      }
    } catch (error) {
      logError("Inventory dashboard metrics fetch failed", error, {
        service: "inventoryService",
        organizationId,
        userId,
        durationMs: elapsedMs(startedAt)
      })
      throw new Error("Operation failed")
    }
  })
}

export async function getStockAlerts() {
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error } = await getOrSetQueryCache(
        `inventory:alerts:${organizationId}`,
        STOCK_ALERTS_CACHE_TTL_MS,
        () => queryStockAlerts(organizationId)
      )
      const alerts = (data ?? []).filter((row) => row.stock_quantity <= row.min_stock)
      logInfo("Stock alerts fetched", { service: "inventoryService", organizationId, userId, count: alerts.length })
      return { data: alerts, error }
    } catch (error) {
      logError("Stock alerts fetch failed", error, { service: "inventoryService", organizationId, userId })
      throw new Error("Operation failed")
    }
  })
}

export async function getStockTransactionHistory() {
  const startedAt = startTimer()
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error } = await queryStockTransactions(organizationId)
      logInfo("Stock transaction history fetched", {
        service: "inventoryService",
        organizationId,
        userId,
        count: data?.length ?? 0,
        durationMs: elapsedMs(startedAt)
      })
      return { data: data ?? [], error }
    } catch (error) {
      logError("Stock transaction history fetch failed", error, {
        service: "inventoryService",
        organizationId,
        userId,
        durationMs: elapsedMs(startedAt)
      })
      throw new Error("Operation failed")
    }
  })
}

export async function getSupplierManagementData() {
  const startedAt = startTimer()
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error } = await querySuppliers(organizationId)
      logInfo("Supplier management data fetched", {
        service: "inventoryService",
        organizationId,
        userId,
        count: data?.length ?? 0,
        durationMs: elapsedMs(startedAt)
      })
      return { data: data ?? [], error }
    } catch (error) {
      logError("Supplier management fetch failed", error, {
        service: "inventoryService",
        organizationId,
        userId,
        durationMs: elapsedMs(startedAt)
      })
      throw new Error("Operation failed")
    }
  })
}

export async function getComponentUsageTracking() {
  const startedAt = startTimer()
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error } = await queryComponentUsage(organizationId)
      logInfo("Component usage tracking fetched", {
        service: "inventoryService",
        organizationId,
        userId,
        count: data?.length ?? 0,
        durationMs: elapsedMs(startedAt)
      })
      return { data: data ?? [], error }
    } catch (error) {
      logError("Component usage fetch failed", error, {
        service: "inventoryService",
        organizationId,
        userId,
        durationMs: elapsedMs(startedAt)
      })
      throw new Error("Operation failed")
    }
  })
}

export type InventorySpareSummaryRow = {
  id: string
  spareName: string
  category: string
  available: number
  reserved: number
  consumed: number
  lastUpdated: string
}

export async function getInventorySpareSummary() {
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { sparesResponse, movementsResponse } = await queryInventorySpareSummary(organizationId)

      const transactionRows = (movementsResponse.data ?? []) as Array<{
        spare_id: string
        movement_type?: string | null
        quantity?: number | null
        reference?: string | null
        created_at: string
      }>
      const perSpare = new Map<string, { reserved: number; consumed: number; lastUpdated: string | null }>()

      transactionRows.forEach((row) => {
        const current = perSpare.get(row.spare_id) ?? { reserved: 0, consumed: 0, lastUpdated: null }
        const reference = row.reference ?? ""

        if (row.movement_type === "reserve" || reference.startsWith("reserve:")) {
          current.reserved += Math.abs(Number(row.quantity ?? 0))
        } else if (row.movement_type === "release" || reference.startsWith("release:")) {
          current.reserved = Math.max(0, current.reserved - Math.abs(Number(row.quantity ?? 0)))
        } else if (row.movement_type === "consume" || reference.startsWith("consume:")) {
          current.consumed += Math.abs(Number(row.quantity ?? 0))
        }

        if (!current.lastUpdated || new Date(row.created_at).getTime() > new Date(current.lastUpdated).getTime()) {
          current.lastUpdated = row.created_at
        }

        perSpare.set(row.spare_id, current)
      })

      const data: InventorySpareSummaryRow[] = (sparesResponse.data ?? []).map((spare) => {
        const summary = perSpare.get(spare.id) ?? { reserved: 0, consumed: 0, lastUpdated: null }
        return {
          id: spare.id,
          spareName: spare.name,
          category: spare.category ?? "-",
          available: Math.max(0, Number(spare.stock_quantity ?? 0)),
          reserved: summary.reserved,
          consumed: summary.consumed,
          lastUpdated: summary.lastUpdated ?? spare.created_at
        }
      })

      logInfo("Inventory spare summary fetched", {
        service: "inventoryService",
        organizationId,
        userId,
        count: data.length
      })

      return {
        data,
        error: sparesResponse.error || movementsResponse.error
      }
    } catch (error) {
      logError("Inventory spare summary fetch failed", error, {
        service: "inventoryService",
        organizationId,
        userId
      })
      throw new Error("Operation failed")
    }
  })
}
