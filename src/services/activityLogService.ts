import { getOrganizationContext } from "../lib/orgContext"
import { insertActivityLog, queryActivityLogs, queryActivityLogsByEntity } from "../repositories/activityLogRepository"
import { logError, logInfo } from "../utils/logger"
import { isOptionalUUID, assertValidUUID } from "../utils/validateUUID"

export async function logActivity(action: string, entityType?: string | null, entityId?: string | null, details?: unknown) {
    if (!isOptionalUUID(entityId)) {
      logError("Invalid entityId in logActivity", new Error(`Invalid UUID: ${entityId}`), { action, entityType, entityId })
      return
    }
  
  try {
    const organizationId = await getOrganizationContext()
    await insertActivityLog({
      organization_id: organizationId,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      details: (details as never) ?? {}
    })
    logInfo("Activity logged", { service: "activityLogService", organizationId, action, entityType, entityId })
  } catch (error) {
    logError("Activity logging failed", error, { service: "activityLogService", action, entityType, entityId })
    // Intentionally ignore logging failures
  }
}

export async function getActivityLogs(limit = 50) {
  const organizationId = await getOrganizationContext()
  const safeLimit = Math.min(500, Math.max(1, limit))
  const { data, error } = await queryActivityLogs(organizationId, safeLimit)
  return { data: data ?? [], error }
}

export async function getCustomerActivityLogs(customerId: string, limit = 100) {
  assertValidUUID(customerId, "customerId")

  const organizationId = await getOrganizationContext()
  const safeLimit = Math.min(500, Math.max(1, limit))
  const { data, error } = await queryActivityLogsByEntity(organizationId, "customer", customerId, safeLimit)
  return { data: data ?? [], error }
}
