import {
  deleteSystemComponentById,
  insertSystem,
  insertSystemComponent,
  querySparesForSystemBuilder,
  querySystemComponents,
  querySystems
} from "../repositories/systemRepository"
import { Database } from "../types/database.types"
import { logError, logInfo } from "../utils/logger"
import { withOrganizationContext } from "../utils/withOrganizationContext"
import { assertValidUUID } from "../utils/validateUUID"

type SystemInsert = Database["public"]["Tables"]["systems"]["Insert"]
type SystemComponentInsert = Database["public"]["Tables"]["system_components"]["Insert"]

export async function getSystems() {
  return withOrganizationContext(async (organizationId) => {
    try {
      const { data, error } = await querySystems(organizationId)
      logInfo("Systems fetched", { service: "systemService", organizationId, count: data?.length ?? 0 })
      return { data: data ?? [], error }
    } catch (error) {
      logError("Systems fetch failed", error, { service: "systemService", organizationId })
      throw new Error("Operation failed")
    }
  })
}

export async function createSystem(payload: Omit<SystemInsert, "organization_id">) {
  if (!payload?.system_name?.trim() || Number.isNaN(Number(payload.capacity_kw))) {
    throw new Error("Operation failed")
  }

  return withOrganizationContext(async (organizationId) => {
    try {
      const { data, error } = await insertSystem(organizationId, payload)
      logInfo("System created", { service: "systemService", organizationId, systemId: data?.id ?? null })
      return { data, error }
    } catch (error) {
      logError("System create failed", error, { service: "systemService", organizationId })
      throw new Error("Operation failed")
    }
  })
}

export async function getSystemComponents(systemId: string) {
  assertValidUUID(systemId, "systemId")

  return withOrganizationContext(async (organizationId) => {
    try {
      const { data, error } = await querySystemComponents(organizationId, systemId)
      logInfo("System components fetched", { service: "systemService", organizationId, systemId, count: data?.length ?? 0 })
      return { data: data ?? [], error }
    } catch (error) {
      logError("System components fetch failed", error, { service: "systemService", organizationId, systemId })
      throw new Error("Operation failed")
    }
  })
}

export async function addSystemComponent(payload: Omit<SystemComponentInsert, "organization_id">) {
    if (payload?.system_id) assertValidUUID(payload.system_id, "systemId")
    if (payload?.spare_id) assertValidUUID(payload.spare_id, "spareId")
  if (!payload?.system_id || !payload?.spare_id || Number(payload.quantity_required) <= 0) {
    throw new Error("Operation failed")
  }

  return withOrganizationContext(async (organizationId) => {
    try {
      const { data, error } = await insertSystemComponent(organizationId, payload)
      logInfo("System component added", { service: "systemService", organizationId, componentId: data?.id ?? null })
      return { data, error }
    } catch (error) {
      logError("System component add failed", error, { service: "systemService", organizationId })
      throw new Error("Operation failed")
    }
  })
}

export async function removeSystemComponent(componentId: string) {
  assertValidUUID(componentId, "componentId")

  return withOrganizationContext(async (organizationId) => {
    try {
      const { error } = await deleteSystemComponentById(organizationId, componentId)
      logInfo("System component removed", { service: "systemService", organizationId, componentId })
      return { error }
    } catch (error) {
      logError("System component remove failed", error, { service: "systemService", organizationId, componentId })
      throw new Error("Operation failed")
    }
  })
}

export async function getSparesForSystemBuilder() {
  return withOrganizationContext(async (organizationId) => {
    try {
      const { data, error } = await querySparesForSystemBuilder(organizationId)
      logInfo("Spares for system builder fetched", { service: "systemService", organizationId, count: data?.length ?? 0 })
      return { data: data ?? [], error }
    } catch (error) {
      logError("Spares for system builder fetch failed", error, { service: "systemService", organizationId })
      throw new Error("Operation failed")
    }
  })
}
