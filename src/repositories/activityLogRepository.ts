import { supabase } from "../lib/supabaseClient"
import { Database } from "../types/database.types"
import { handleRepositoryError } from "./repositoryUtils"
import { assertValidUUID } from "../utils/validateUUID"

type ActivityLogInsert = Database["public"]["Tables"]["activity_logs"]["Insert"]

export async function insertActivityLog(payload: ActivityLogInsert) {
  const response = await supabase.from("activity_logs").insert(payload)
  if (response.error) {
    handleRepositoryError("activityLogRepository", "insertActivityLog", response.error)
  }
  return response
}

export async function queryActivityLogs(organizationId: string, limit = 50) {
  const response = await supabase
    .from("activity_logs")
    .select("id,action,entity_type,entity_id,details,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(Math.min(500, Math.max(1, limit)))

  if (response.error) {
    handleRepositoryError("activityLogRepository", "queryActivityLogs", response.error)
  }

  return response
}

export async function queryActivityLogsByEntity(
  organizationId: string,
  entityType: string,
  entityId: string,
  limit = 100
) {
  assertValidUUID(organizationId, "organizationId")
  assertValidUUID(entityId, "entityId")
  
  const response = await supabase
    .from("activity_logs")
    .select("id,action,entity_type,entity_id,details,created_at")
    .eq("organization_id", organizationId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(Math.min(500, Math.max(1, limit)))

  if (response.error) {
    handleRepositoryError("activityLogRepository", "queryActivityLogsByEntity", response.error)
  }

  return response
}
