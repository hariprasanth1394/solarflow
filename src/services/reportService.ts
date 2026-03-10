import {
  queryCustomerReports,
  queryDashboardSummaryRaw,
  queryInventoryReports,
  queryTaskReports
} from "../repositories/reportRepository"
import { getOrSetQueryCache } from "../lib/queryCache"
import { elapsedMs, logError, logInfo, startTimer } from "../utils/logger"
import { withRequestContext } from "../utils/withRequestContext"

const DASHBOARD_SUMMARY_CACHE_TTL_MS = 15_000

export const getDashboardSummary = async () => {
  const startedAt = startTimer()
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const [customers, activeTasks, inventoryItems, availableSystems, taskStatuses, inventoryStock] =
        await getOrSetQueryCache(`reports:dashboard:${organizationId}`, DASHBOARD_SUMMARY_CACHE_TTL_MS, () =>
          queryDashboardSummaryRaw(organizationId)
        )

      const availableSystemsTotal = (availableSystems.data ?? []).reduce((sum, row) => sum + (row.available_systems ?? 0), 0)

      const taskStatusSummary = (taskStatuses.data ?? []).reduce<Record<string, number>>((acc, row) => {
        const key = row.status || "Unknown"
        acc[key] = (acc[key] ?? 0) + 1
        return acc
      }, {})

      const data = {
        totalCustomers: customers.count ?? 0,
        activeTasks: activeTasks.count ?? 0,
        inventoryItems: inventoryItems.count ?? 0,
        availableSolarSystems: availableSystemsTotal,
        taskStatusSummary,
        inventoryStockSummary: inventoryStock.data ?? []
      }

      logInfo("Dashboard summary computed", {
        service: "reportService",
        organizationId,
        userId,
        durationMs: elapsedMs(startedAt),
        totalCustomers: data.totalCustomers,
        activeTasks: data.activeTasks
      })

      return {
        data,
        error: customers.error || activeTasks.error || inventoryItems.error || availableSystems.error || taskStatuses.error
      }
    } catch (error) {
      logError("Dashboard summary failed", error, {
        service: "reportService",
        organizationId,
        userId,
        durationMs: elapsedMs(startedAt)
      })
      throw new Error("Operation failed")
    }
  })
}

export const getInventoryReports = async (limit = 200) => {
  const safeLimit = Math.min(500, Math.max(1, limit))
  const startedAt = startTimer()
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error } = await queryInventoryReports(organizationId, safeLimit)
      logInfo("Inventory reports fetched", {
        service: "reportService",
        organizationId,
        userId,
        limit: safeLimit,
        count: data?.length ?? 0,
        durationMs: elapsedMs(startedAt)
      })
      return { data: data ?? [], error }
    } catch (error) {
      logError("Inventory reports fetch failed", error, {
        service: "reportService",
        organizationId,
        userId,
        limit: safeLimit,
        durationMs: elapsedMs(startedAt)
      })
      throw new Error("Operation failed")
    }
  })
}

export const getCustomerReports = async (limit = 200) => {
  const safeLimit = Math.min(500, Math.max(1, limit))
  const startedAt = startTimer()
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error } = await queryCustomerReports(organizationId, safeLimit)
      logInfo("Customer reports fetched", {
        service: "reportService",
        organizationId,
        userId,
        limit: safeLimit,
        count: data?.length ?? 0,
        durationMs: elapsedMs(startedAt)
      })
      return { data: data ?? [], error }
    } catch (error) {
      logError("Customer reports fetch failed", error, {
        service: "reportService",
        organizationId,
        userId,
        limit: safeLimit,
        durationMs: elapsedMs(startedAt)
      })
      throw new Error("Operation failed")
    }
  })
}

export const getTaskReports = async (limit = 200) => {
  const safeLimit = Math.min(500, Math.max(1, limit))
  const startedAt = startTimer()
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error } = await queryTaskReports(organizationId, safeLimit)
      logInfo("Task reports fetched", {
        service: "reportService",
        organizationId,
        userId,
        limit: safeLimit,
        count: data?.length ?? 0,
        durationMs: elapsedMs(startedAt)
      })
      return { data: data ?? [], error }
    } catch (error) {
      logError("Task reports fetch failed", error, {
        service: "reportService",
        organizationId,
        userId,
        limit: safeLimit,
        durationMs: elapsedMs(startedAt)
      })
      throw new Error("Operation failed")
    }
  })
}
