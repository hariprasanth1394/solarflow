import { queryOrganizationSettings, upsertOrganizationSettings } from "../repositories/settingsRepository"
import { Database } from "../types/database.types"
import { logError, logInfo } from "../utils/logger"
import { withOrganizationContext } from "../utils/withOrganizationContext"

type OrganizationSettingsUpdate = Database["public"]["Tables"]["organization_settings"]["Update"]

export const getOrganizationSettings = async () => {
  return withOrganizationContext(async (organizationId) => {
    try {
      const { data, error } = await queryOrganizationSettings(organizationId)
      logInfo("Organization settings fetched", { service: "settingsService", organizationId })
      return { data, error }
    } catch (error) {
      logError("Organization settings fetch failed", error, { service: "settingsService", organizationId })
      throw new Error("Operation failed")
    }
  })
}

export const updateOrganizationSettings = async (payload: OrganizationSettingsUpdate, id?: string | null) => {
  if (!payload || Object.keys(payload).length === 0) {
    throw new Error("Operation failed")
  }

  return withOrganizationContext(async (organizationId) => {
    try {
      const { data, error } = await upsertOrganizationSettings(organizationId, payload, id)
      logInfo("Organization settings updated", { service: "settingsService", organizationId, id: id ?? null })
      return { data, error }
    } catch (error) {
      logError("Organization settings update failed", error, { service: "settingsService", organizationId, id: id ?? null })
      throw new Error("Operation failed")
    }
  })
}
