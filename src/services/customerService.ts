import {
  deleteCustomerById,
  fetchAssignableUsers,
  fetchCustomerById,
  fetchCustomers,
  insertCustomer,
  updateCustomerById
} from "../repositories/customerRepository"
import { Database } from "../types/database.types"
import { getOrSetQueryCache, invalidateQueryCacheByPrefix } from "../lib/queryCache"
import { elapsedMs, logError, logInfo, logWarn, startTimer } from "../utils/logger"
import { withRequestContext } from "../utils/withRequestContext"
import { assertValidUUID } from "../utils/validateUUID"
import { logActivity } from "./activityLogService"
import { evaluateCustomerWorkflow, getCustomerWorkflowProgress } from "./customerWorkflowService"
import { reserveInventoryForCustomerInstallationWithContext } from "./installationInventoryService"
import type { WorkflowStage } from "../repositories/customerWorkflowRepository"

type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"]
type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"]

const CUSTOMER_LIST_CACHE_TTL_MS = 15_000
const WORKFLOW_STAGE_ORDER: WorkflowStage[] = ["CREATED", "SUBMITTED", "APPROVED", "INSTALLATION", "CLOSED"]
const ALLOWED_STAGE_TRANSITIONS: Record<WorkflowStage, WorkflowStage[]> = {
  CREATED: ["SUBMITTED"],
  SUBMITTED: ["APPROVED"],
  APPROVED: ["INSTALLATION"],
  INSTALLATION: ["CLOSED"],
  CLOSED: []
}

type PaymentSnapshot = {
  total: number
  paid: number
  remaining: number
  status: "Pending" | "Partial" | "Paid"
}

function parseLatestAmount(notes: string | null | undefined, key: string) {
  const matches = Array.from((notes ?? "").matchAll(new RegExp(`${key}:\\s*([0-9]+(?:\\.[0-9]+)?)`, "gi")))
  const last = matches[matches.length - 1]?.[1]
  return last ? Number(last) : 0
}

function extractPaymentStatus(notes: string | null | undefined) {
  const match = (notes ?? "").match(/Payment Status:\s*([^\n]+)/i)
  return match?.[1]?.trim() ?? ""
}

function derivePaymentSnapshot(notes: string | null | undefined): PaymentSnapshot {
  const total = parseLatestAmount(notes, "Total Amount")
  const paid = parseLatestAmount(notes, "Paid Amount")
  const remaining = Math.max(total - paid, 0)
  const normalizedStatus = extractPaymentStatus(notes).toLowerCase()

  if (total > 0) {
    if (paid >= total) return { total, paid, remaining: 0, status: "Paid" }
    if (paid > 0) return { total, paid, remaining, status: "Partial" }
  }

  if (normalizedStatus === "paid") return { total, paid, remaining, status: "Paid" }
  if (normalizedStatus.includes("partial")) return { total, paid, remaining, status: "Partial" }
  return { total, paid, remaining, status: "Pending" }
}

async function resolveActorName(organizationId: string, userId: string) {
  try {
    const users = await fetchAssignableUsers(organizationId)
    const user = users.find((item) => item.id === userId)
    return user?.name || user?.email || userId
  } catch {
    return userId
  }
}

function validateWorkflowTransition(currentStage: WorkflowStage | undefined, nextStage: WorkflowStage | undefined, payload: CustomerUpdate) {
  if (!nextStage) return

  const source = currentStage ?? "CREATED"
  const fromIndex = WORKFLOW_STAGE_ORDER.indexOf(source)
  const toIndex = WORKFLOW_STAGE_ORDER.indexOf(nextStage)

  if (fromIndex === -1 || toIndex === -1) {
    throw new Error("Invalid workflow transition: unknown stage")
  }

  if (source !== "CREATED" && nextStage === "CREATED") {
    throw new Error("Invalid workflow transition: cannot reset to Created")
  }

  if (source === nextStage) {
    if (nextStage === "CLOSED") {
      const payment = derivePaymentSnapshot(payload.notes)
      if (payment.status !== "Paid") {
        throw new Error("Invalid workflow transition: cannot move to Closure without full payment")
      }
    }
    return
  }

  if (toIndex < fromIndex) {
    throw new Error("Invalid workflow transition: cannot move backward")
  }

  if (!ALLOWED_STAGE_TRANSITIONS[source].includes(nextStage)) {
    throw new Error(`Invalid workflow transition: ${source} -> ${nextStage} is not allowed`)
  }

  if (nextStage === "INSTALLATION") {
    const status = String(payload.status ?? "").toLowerCase()
    const hasApprovalStatus = status.includes("approved")
    const notes = String(payload.notes ?? "")
    const hasApprovalEvidence = /approval no:|reference:/i.test(notes)
    if (source !== "APPROVED") {
      throw new Error("Invalid workflow transition: installation must start from Approved")
    }
    if (!hasApprovalStatus && !status.includes("progress") && !status.includes("pending")) {
      throw new Error("Invalid workflow transition: installation requires approved status")
    }
    if (!hasApprovalEvidence) {
      throw new Error("Invalid workflow transition: approval document reference is required")
    }
  }

  if (nextStage === "APPROVED") {
    const status = String(payload.status ?? "").toLowerCase()
    const notes = String(payload.notes ?? "")
    const hasApprovalEvidence = /approval no:|reference:/i.test(notes)
    if (source !== "SUBMITTED") {
      throw new Error("Invalid workflow transition: approval must follow submission")
    }
    if (!status.includes("approved")) {
      throw new Error("Invalid workflow transition: approved stage requires approved status")
    }
    if (!hasApprovalEvidence) {
      throw new Error("Invalid workflow transition: approval document reference is required")
    }
  }

  if (nextStage === "CLOSED") {
    const payment = derivePaymentSnapshot(payload.notes)
    if (source !== "INSTALLATION") {
      throw new Error("Invalid workflow transition: closure must follow installation")
    }
    if (payment.status !== "Paid") {
      throw new Error("Invalid workflow transition: cannot move to Closure without full payment")
    }
  }
}

function toWorkflowStage(value: string | null | undefined): WorkflowStage | undefined {
  const normalized = (value ?? "").toUpperCase().trim()
  if (!normalized) return undefined
  if (normalized.includes("CLOSED")) return "CLOSED"
  if (normalized.includes("INSTALL")) return "INSTALLATION"
  if (normalized.includes("APPROV")) return "APPROVED"
  if (normalized.includes("SUBMIT") || normalized.includes("GOV")) return "SUBMITTED"
  if (normalized.includes("CREATE")) return "CREATED"
  return undefined
}

export async function getCustomers(options?: {
  search?: string
  status?: string
  page?: number
  pageSize?: number
}) {
  const startedAt = startTimer()
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      logInfo("Fetching customers", { service: "customerService", organizationId, userId })
      const cacheKey = `customers:list:${organizationId}:${JSON.stringify(options ?? {})}`
      const result = await getOrSetQueryCache(cacheKey, CUSTOMER_LIST_CACHE_TTL_MS, () =>
        fetchCustomers(organizationId, options)
      )
      logInfo("Fetched customers", {
        service: "customerService",
        organizationId,
        userId,
        durationMs: elapsedMs(startedAt),
        count: result.count
      })
      return result
    } catch (error) {
      logError("Customer fetch failed", error, {
        service: "customerService",
        organizationId,
        userId,
        durationMs: elapsedMs(startedAt)
      })
      throw new Error("Operation failed")
    }
  })
}

export async function getAssignableSalesReps() {
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      logInfo("Fetching assignable sales reps", { service: "customerService", organizationId, userId })
      const data = await fetchAssignableUsers(organizationId)
      return data
    } catch (error) {
      logError("Assignable sales rep fetch failed", error, { service: "customerService", organizationId, userId })
      throw new Error("Operation failed")
    }
  })
}

export async function createCustomer(payload: Omit<CustomerInsert, "organization_id">) {
  if (!payload.name?.trim()) {
    throw new Error("Operation failed")
  }

  const startedAt = startTimer()
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const data = await insertCustomer(organizationId, payload)
      invalidateQueryCacheByPrefix(`customers:list:${organizationId}:`)
      await logActivity("Customer created", "customer", data.id, { name: data.name })
      if (data.system_id) {
        try {
          await reserveInventoryForCustomerInstallationWithContext({
            organizationId,
            customerId: data.id,
            systemId: data.system_id
          })
        } catch (inventoryError) {
          logWarn("Inventory reservation skipped on customer create", {
            service: "customerService",
            organizationId,
            userId,
            customerId: data.id,
            systemId: data.system_id,
            error: inventoryError instanceof Error ? inventoryError.message : String(inventoryError)
          })
        }
      }
      try {
        await evaluateCustomerWorkflow(data.id, {
          triggerEvent: "customer-created",
          metadata: { source: "customerService.createCustomer" },
          organizationId,
          userId,
          forcePersistEntry: true
        })
      } catch (workflowError) {
        logWarn("Workflow evaluation skipped on customer create", {
          service: "customerService",
          organizationId,
          userId,
          customerId: data.id,
          error: workflowError instanceof Error ? workflowError.message : String(workflowError)
        })
      }
      logInfo("Customer created", {
        service: "customerService",
        organizationId,
        userId,
        customerId: data.id,
        durationMs: elapsedMs(startedAt)
      })
      return data
    } catch (error) {
      logError("Customer create failed", error, {
        service: "customerService",
        organizationId,
        userId,
        durationMs: elapsedMs(startedAt)
      })
      throw new Error("Operation failed")
    }
  })
}

export async function updateCustomer(id: string, payload: CustomerUpdate) {
  assertValidUUID(id, "customerId")
  const minimumStage = toWorkflowStage(payload.current_stage)

  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const previous = await fetchCustomerById(id, organizationId)
      const previousRecord = (previous ?? {}) as Record<string, unknown>
      const previousStatus = String(previousRecord.status ?? "")
      const previousStageRaw =
        typeof previousRecord.current_stage === "string" ? previousRecord.current_stage : previousStatus
      const previousStage = toWorkflowStage(previousStageRaw) ?? "CREATED"
      validateWorkflowTransition(previousStage, minimumStage, payload)
      const transitionTimestamp = new Date().toISOString()
      const paymentSnapshot = derivePaymentSnapshot(payload.notes)
      const stageChanged = Boolean(minimumStage && minimumStage !== previousStage)

      const data = await updateCustomerById(id, organizationId, payload)
      invalidateQueryCacheByPrefix(`customers:list:${organizationId}:`)
      await logActivity(stageChanged ? "Customer stage transitioned" : "Customer updated", "customer", id, {
        action_type: stageChanged ? "workflow-transition" : "workflow-update",
        actor: await resolveActorName(organizationId, userId),
        timestamp: transitionTimestamp,
        previous_state: {
          stage: previousStage,
          status: previousStatus
        },
        new_state: {
          stage: minimumStage ?? previousStage,
          status: payload.status ?? previousStatus
        },
        payment: paymentSnapshot,
        changed_fields: Object.keys(payload)
      })
      try {
        await evaluateCustomerWorkflow(id, {
          triggerEvent: "approval-updated",
          metadata: { source: "customerService.updateCustomer", fields: Object.keys(payload) },
          minimumStage,
          organizationId,
          userId
        })
      } catch (workflowError) {
        logWarn("Workflow evaluation skipped on customer update", {
          service: "customerService",
          organizationId,
          userId,
          customerId: id,
          error: workflowError instanceof Error ? workflowError.message : String(workflowError)
        })
      }
      logInfo("Customer updated", { service: "customerService", organizationId, userId, customerId: id })
      return data
    } catch (error) {
      logError("Customer update failed", error, { service: "customerService", organizationId, userId, customerId: id })
      throw new Error(error instanceof Error ? error.message : "Operation failed")
    }
  })
}

export async function getCustomerById(id: string) {
    assertValidUUID(id, "customerId")
  
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const data = await fetchCustomerById(id, organizationId)
      if (!data) {
        logInfo("Customer response empty", { service: "customerService", organizationId, userId, customerId: id })
      }
      return { data, error: null }
    } catch (error) {
      logError("Customer by id fetch failed", error, { service: "customerService", organizationId, userId, customerId: id })
      throw new Error("Operation failed")
    }
  })
}

export async function deleteCustomer(id: string) {
    assertValidUUID(id, "customerId")
  
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      await deleteCustomerById(id, organizationId)
      invalidateQueryCacheByPrefix(`customers:list:${organizationId}:`)
      await logActivity("Customer deleted", "customer", id)
      logInfo("Customer deleted", { service: "customerService", organizationId, userId, customerId: id })
    } catch (error) {
      logError("Customer delete failed", error, { service: "customerService", organizationId, userId, customerId: id })
      throw new Error("Operation failed")
    }
  })
}

export async function getCustomerProgress(customerId: string, limit = 50) {
    assertValidUUID(customerId, "customerId")
  
  return getCustomerWorkflowProgress(customerId, limit)
}
