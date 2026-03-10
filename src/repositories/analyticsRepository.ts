import { supabase } from "../lib/supabaseClient"

export async function queryFinancialSummary(organizationId: string) {
  return Promise.all([
    supabase
      .from("financial_transactions" as never)
      .select("amount")
      .eq("organization_id", organizationId)
      .eq("type", "sale")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("projects" as never)
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "Completed"),
    supabase
      .from("financial_transactions" as never)
      .select("amount,cost,month")
      .eq("organization_id", organizationId)
      .order("month", { ascending: true })
      .limit(1000),
    supabase.from("systems").select("capacity_kw").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(500),
    supabase.from("sales_pipeline" as never).select("status").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(1000)
  ])
}
