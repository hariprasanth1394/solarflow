import { supabase } from "../lib/supabaseClient"
import { handleRepositoryError } from "./repositoryUtils"

export const queryDashboardSummaryRaw = async (organizationId: string) => {
  const responses = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .neq("status", "Completed"),
    supabase.from("spares").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.rpc("calculate_system_inventory_availability", { p_organization_id: organizationId }),
    supabase
      .from("tasks")
      .select("status")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("spares")
      .select("name,stock_quantity,min_stock", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("stock_quantity", { ascending: true })
      .limit(20)
  ])

  responses.forEach((response, index) => {
    if (response.error) {
      handleRepositoryError("reportRepository", `queryDashboardSummaryRaw.${index}`, response.error)
    }
  })

  return responses
}

export const queryInventoryReports = async (organizationId: string, limit = 200) => {
  const response = await supabase
    .from("spares")
    .select("id,name,category,stock_quantity,min_stock,cost_price")
    .eq("organization_id", organizationId)
    .order("stock_quantity", { ascending: true })
    .limit(Math.min(500, Math.max(1, limit)))

  if (response.error) {
    handleRepositoryError("reportRepository", "queryInventoryReports", response.error)
  }

  return response
}

export const queryCustomerReports = async (organizationId: string, limit = 200) => {
  const response = await supabase
    .from("customers")
    .select("id,name,company,status,assigned_to,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(Math.min(500, Math.max(1, limit)))

  if (response.error) {
    handleRepositoryError("reportRepository", "queryCustomerReports", response.error)
  }

  return response
}

export const queryTaskReports = async (organizationId: string, limit = 200) => {
  const response = await supabase
    .from("tasks")
    .select("id,title,status,priority,assigned_to,due_date")
    .eq("organization_id", organizationId)
    .order("due_date", { ascending: true })
    .limit(Math.min(500, Math.max(1, limit)))

  if (response.error) {
    handleRepositoryError("reportRepository", "queryTaskReports", response.error)
  }

  return response
}
