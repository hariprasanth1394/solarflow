import {
  fetchCustomerDocuments,
  fetchCustomerStageHistory,
  fetchCustomerTasks,
  fetchCustomerWorkflowProjection,
  insertCustomerProgressEntry,
  updateCustomerCurrentStage,
  type WorkflowStage
} from "../repositories/customerWorkflowRepository"
import { elapsedMs, logError, logInfo, startTimer } from "../utils/logger"
import { withRequestContext } from "../utils/withRequestContext"
import { assertValidUUID } from "../utils/validateUUID"
import { logActivity } from "./activityLogService"

const STAGE_ORDER: WorkflowStage[] = ["CREATED", "SUBMITTED", "APPROVED", "INSTALLATION", "CLOSED"]

const NEXT_ACTIONS: Record<WorkflowStage, string> = {
  CREATED: "Upload government submission documents",
  SUBMITTED: "Upload and verify approval documents",
  APPROVED: "Complete installation task",
  INSTALLATION: "Upload final closure documentation",
  CLOSED: "Workflow complete"
}

function parseStageFromName(name: string) {
  const normalized = name.toLowerCase()
  const isGovernmentSubmission =
    normalized.includes("submission") ||
    normalized.includes("permit") ||
    normalized.includes("application") ||
    normalized.includes("discom")

  const isApproval = normalized.includes("approval") || normalized.includes("approved") || normalized.includes("verification")
  const isClosure = normalized.includes("closure") || normalized.includes("handover") || normalized.includes("completion")

  return { isGovernmentSubmission, isApproval, isClosure }
}

function highestStage(stages: WorkflowStage[]) {
  return stages.reduce<WorkflowStage>((acc, stage) => {
    return STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(acc) ? stage : acc
  }, "CREATED")
}

function resolveStageFromSignals(params: {
  hasSubmissionDocument: boolean
  hasApprovalDocument: boolean
  hasCompletedInstallationTask: boolean
  hasFinalClosureDocument: boolean
}): WorkflowStage {
  if (params.hasFinalClosureDocument) return "CLOSED"
  if (params.hasCompletedInstallationTask) return "INSTALLATION"
  if (params.hasApprovalDocument) return "APPROVED"
  if (params.hasSubmissionDocument) return "SUBMITTED"
  return "CREATED"
}

export async function evaluateCustomerWorkflow(
  customerId: string,
  options?: {
    triggerEvent?: string
    metadata?: Record<string, unknown>
    organizationId?: string
    userId?: string
    forcePersistEntry?: boolean
  }
) {
  const execute = async (context: { organizationId: string; userId: string }) => {
      assertValidUUID(customerId, "customerId")
    
    const startedAt = startTimer()

    try {
      const projection = await fetchCustomerWorkflowProjection(customerId, context.organizationId)
      if (!projection) {
        return {
          customerId,
          currentStage: "CREATED" as WorkflowStage,
          previousStage: null as WorkflowStage | null,
          changed: false,
          nextRequiredAction: NEXT_ACTIONS.CREATED
        }
      }

      const [documents, tasks] = await Promise.all([
        fetchCustomerDocuments(customerId, context.organizationId),
        fetchCustomerTasks(customerId, context.organizationId)
      ])

      const signalFromDocuments = documents.map((document) => parseStageFromName(document.name))
      const hasSubmissionDocument = signalFromDocuments.some((item) => item.isGovernmentSubmission)
      const hasApprovalDocument = signalFromDocuments.some((item) => item.isApproval)
      const hasFinalClosureDocument = signalFromDocuments.some((item) => item.isClosure)

      const hasCompletedInstallationTask = tasks.some((task) => {
        const isCompleted = (task.status ?? "").toLowerCase().includes("complete")
        const text = `${task.title} ${task.description ?? ""}`.toLowerCase()
        const isInstallationTask = text.includes("installation") || text.includes("install")
        return isCompleted && isInstallationTask
      })

      const evaluatedStage = resolveStageFromSignals({
        hasSubmissionDocument,
        hasApprovalDocument,
        hasCompletedInstallationTask,
        hasFinalClosureDocument
      })

      const previousStage = projection.current_stage ?? "CREATED"
      const currentStage = highestStage([previousStage, evaluatedStage])
      const changed = previousStage !== currentStage
      const nextRequiredAction = NEXT_ACTIONS[currentStage]

      if (changed) {
        await updateCustomerCurrentStage(customerId, context.organizationId, currentStage)
      }

      if (changed || options?.forcePersistEntry) {
        await insertCustomerProgressEntry({
          organization_id: context.organizationId,
          customer_id: customerId,
          previous_stage: previousStage,
          current_stage: currentStage,
          trigger_event: options?.triggerEvent ?? "workflow-evaluation",
          next_required_action: nextRequiredAction,
          metadata: {
            ...(options?.metadata ?? {}),
            hasSubmissionDocument,
            hasApprovalDocument,
            hasCompletedInstallationTask,
            hasFinalClosureDocument
          },
          changed_by: context.userId
        })
      }

      if (changed) {
        await logActivity(`Stage changed from ${previousStage} → ${currentStage}`, "customer", customerId, {
          previousStage,
          currentStage,
          triggerEvent: options?.triggerEvent ?? "workflow-evaluation"
        })
      }

      logInfo("Customer workflow evaluated", {
        service: "customerWorkflowService",
        organizationId: context.organizationId,
        userId: context.userId,
        customerId,
        previousStage,
        currentStage,
        changed,
        durationMs: elapsedMs(startedAt)
      })

      return {
        customerId,
        currentStage,
        previousStage,
        changed,
        nextRequiredAction
      }
    } catch (error) {
      logError("Customer workflow evaluation failed", error, {
        service: "customerWorkflowService",
        organizationId: context.organizationId,
        userId: context.userId,
        customerId,
        triggerEvent: options?.triggerEvent ?? "workflow-evaluation"
      })
      throw new Error("Operation failed")
    }
  }

  if (options?.organizationId && options?.userId) {
    return execute({ organizationId: options.organizationId, userId: options.userId })
  }

  return withRequestContext(async (context) => execute(context))
}

export async function getCustomerWorkflowProgress(customerId: string, limit = 50) {
    assertValidUUID(customerId, "customerId")
  
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const [projection, stageHistory] = await Promise.all([
        fetchCustomerWorkflowProjection(customerId, organizationId),
        fetchCustomerStageHistory(customerId, organizationId, limit)
      ])

      const currentStage = projection?.current_stage ?? "CREATED"
      const nextRequiredAction = NEXT_ACTIONS[currentStage]

      logInfo("Customer workflow progress fetched", {
        service: "customerWorkflowService",
        organizationId,
        userId,
        customerId,
        currentStage,
        historyCount: stageHistory.length
      })

      return {
        current_stage: currentStage,
        stage_history: stageHistory,
        next_required_action: nextRequiredAction
      }
    } catch (error) {
      logError("Customer workflow progress fetch failed", error, {
        service: "customerWorkflowService",
        organizationId,
        userId,
        customerId
      })
      throw new Error("Operation failed")
    }
  })
}
