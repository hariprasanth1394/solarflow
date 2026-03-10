import { supabase } from "../lib/supabaseClient"
import { handleRepositoryError } from "./repositoryUtils"

export async function queryLowStockAlerts(organizationId: string) {
  const response = await supabase
    .from("spares")
    .select("id,name,stock_quantity,min_stock")
    .eq("organization_id", organizationId)
    .order("stock_quantity", { ascending: true })
    .limit(100)

  if (response.error) {
    handleRepositoryError("notificationsRepository", "queryLowStockAlerts", response.error)
  }

  return response
}

export async function queryUpcomingTaskDeadlines(organizationId: string) {
  const now = new Date()
  const future = new Date(now)
  future.setDate(now.getDate() + 7)

  const response = await supabase
    .from("tasks")
    .select("id,title,status,due_date,priority")
    .eq("organization_id", organizationId)
    .neq("status", "Completed")
    .gte("due_date", now.toISOString())
    .lte("due_date", future.toISOString())
    .order("due_date", { ascending: true })
    .limit(100)

  if (response.error) {
    handleRepositoryError("notificationsRepository", "queryUpcomingTaskDeadlines", response.error)
  }

  return response
}

export async function queryInventoryShortages(organizationId: string) {
  const response = await supabase.rpc("calculate_system_inventory_availability", { p_organization_id: organizationId })
  if (response.error) {
    handleRepositoryError("notificationsRepository", "queryInventoryShortages", response.error)
  }
  return response
}

export async function queryRecentActivityLogs(organizationId: string, limit = 20) {
  const response = await supabase
    .from("activity_logs")
    .select("id,action,entity_type,entity_id,details,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(Math.min(200, Math.max(1, limit)))

  if (response.error) {
    handleRepositoryError("notificationsRepository", "queryRecentActivityLogs", response.error)
  }

  return response
}
