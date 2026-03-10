import {
  queryInventoryShortages,
  queryLowStockAlerts,
  queryRecentActivityLogs,
  queryUpcomingTaskDeadlines
} from "../repositories/notificationsRepository"
import { logError, logInfo } from "../utils/logger"
import { withOrganizationContext } from "../utils/withOrganizationContext"

export async function getNotificationSummary() {
  return withOrganizationContext(async (organizationId) => {
    try {
      const [lowStock, deadlines, shortages] = await Promise.all([
        queryLowStockAlerts(organizationId),
        queryUpcomingTaskDeadlines(organizationId),
        queryInventoryShortages(organizationId)
      ])

      const lowStockItems = (lowStock.data ?? []).filter((item) => item.stock_quantity <= item.min_stock)
      const inventoryShortages = (shortages.data ?? []).filter((item) => (item.available_systems ?? 0) <= 0)

      const result = {
        data: {
          lowStockWarnings: lowStockItems,
          taskDeadlines: deadlines.data ?? [],
          inventoryShortages,
          counts: {
            lowStockWarnings: lowStockItems.length,
            taskDeadlines: (deadlines.data ?? []).length,
            inventoryShortages: inventoryShortages.length
          }
        },
        error: lowStock.error || deadlines.error || shortages.error
      }

      logInfo("Notification summary fetched", {
        service: "notificationsService",
        organizationId,
        lowStock: result.data.counts.lowStockWarnings,
        deadlines: result.data.counts.taskDeadlines
      })

      return result
    } catch (error) {
      logError("Notification summary fetch failed", error, { service: "notificationsService", organizationId })
      throw new Error("Operation failed")
    }
  })
}

export async function getActivityLogs(limit = 30) {
  const safeLimit = Math.min(500, Math.max(1, limit))
  return withOrganizationContext(async (organizationId) => {
    try {
      const { data, error } = await queryRecentActivityLogs(organizationId, safeLimit)
      logInfo("Notification activity logs fetched", { service: "notificationsService", organizationId, limit: safeLimit })
      return { data: data ?? [], error }
    } catch (error) {
      logError("Notification activity logs fetch failed", error, { service: "notificationsService", organizationId, limit: safeLimit })
      throw new Error("Operation failed")
    }
  })
}
