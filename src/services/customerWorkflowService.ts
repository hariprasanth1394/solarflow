import {
  fetchCustomerDocuments,
  fetchCustomerStageHistory,
  fetchCustomerTasks,
  fetchCustomerWorkflowProjection,
  insertCustomerProgressEntry,
  updateCustomerCurrentStage,
  updateCustomerStageCompletion,
  fetchCustomerStageCompletions,
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

function calculateCurrentStageFromCompletions(completions: {
  submission_completed: boolean
  approval_completed: boolean
  installation_completed: boolean
  closure_completed: boolean
}): WorkflowStage {
  if (completions.closure_completed) return "CLOSED"
  if (completions.installation_completed) return "INSTALLATION"
  if (completions.approval_completed) return "APPROVED"
  if (completions.submission_completed) return "SUBMITTED"
  return "CREATED"
}

export async function evaluateCustomerWorkflow(
  customerId: string,
  options?: {
    triggerEvent?: string
    metadata?: Record<string, unknown>
    minimumStage?: WorkflowStage
    organizationId?: string
    userId?: string
    forcePersistEntry?: boolean
  }
) {
  const execute = async (context: { organizationId: string; userId: string }) => {
      assertValidUUID(customerId, "customerId")
    
    const startedAt = startTimer()

    try {
      const [projection, completions] = await Promise.all([
        fetchCustomerWorkflowProjection(customerId, context.organizationId),
        fetchCustomerStageCompletions(customerId, context.organizationId)
      ])

      if (!projection) {
        return {
          customerId,
          currentStage: "CREATED" as WorkflowStage,
          previousStage: null as WorkflowStage | null,
          changed: false,
          nextRequiredAction: NEXT_ACTIONS.CREATED
        }
      }

      const previousStage = projection.current_stage ?? "CREATED"
      const currentStage = calculateCurrentStageFromCompletions(completions)
      const explicitMinimumStage = options?.minimumStage
      const finalStage = highestStage([previousStage, currentStage, explicitMinimumStage].filter(Boolean) as WorkflowStage[])
      const changed = previousStage !== finalStage
      const nextRequiredAction = NEXT_ACTIONS[finalStage]

      if (changed) {
        await updateCustomerCurrentStage(customerId, context.organizationId, finalStage)
      }

      if (changed || options?.forcePersistEntry) {
        await insertCustomerProgressEntry({
          organization_id: context.organizationId,
          customer_id: customerId,
          previous_stage: previousStage,
          current_stage: finalStage,
          trigger_event: options?.triggerEvent ?? "workflow-evaluation",
          next_required_action: nextRequiredAction,
          metadata: {
            ...(options?.metadata ?? {}),
            stageCompletions: completions
          },
          changed_by: context.userId
        })
      }

      if (changed) {
        await logActivity(`Stage changed from ${previousStage} → ${finalStage}`, "customer", customerId, {
          previousStage,
          currentStage: finalStage,
          triggerEvent: options?.triggerEvent ?? "workflow-evaluation"
        })
      }

      logInfo("Customer workflow evaluated", {
        service: "customerWorkflowService",
        organizationId: context.organizationId,
        userId: context.userId,
        customerId,
        previousStage,
        currentStage: finalStage,
        changed,
        durationMs: elapsedMs(startedAt)
      })

      return {
        customerId,
        currentStage: finalStage,
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

export async function completeCustomerStage(
  customerId: string,
  stage: WorkflowStage,
  options?: {
    triggerEvent?: string
    metadata?: Record<string, unknown>
    organizationId?: string
    userId?: string
  }
) {
  const execute = async (context: { organizationId: string; userId: string }) => {
    assertValidUUID(customerId, "customerId")

    // Only allow completion of specific stages (not CREATED)
    if (stage === "CREATED") {
      throw new Error("Cannot complete CREATED stage")
    }

    const startedAt = startTimer()

    try {
      // Check current completions to ensure we're not going backwards
      const completions = await fetchCustomerStageCompletions(customerId, context.organizationId)

      // Prevent marking a stage as incomplete if it was already completed
      const stageColumn = getStageCompletionColumn(stage)
      if (completions[stageColumn] === true) {
        logInfo("Stage already completed, skipping", {
          service: "customerWorkflowService",
          customerId,
          stage,
          organizationId: context.organizationId
        })
        return { customerId, stage, completed: true, wasAlreadyCompleted: true }
      }

      // Mark the stage as completed
      await updateCustomerStageCompletion(customerId, context.organizationId, stage, true)

      // Re-evaluate the workflow to update current_stage if needed
      const evaluation = await evaluateCustomerWorkflow(customerId, {
        triggerEvent: options?.triggerEvent ?? `stage-${stage.toLowerCase()}-completed`,
        metadata: {
          ...(options?.metadata ?? {}),
          completedStage: stage
        },
        organizationId: context.organizationId,
        userId: context.userId
      })

      logInfo("Customer stage completed", {
        service: "customerWorkflowService",
        organizationId: context.organizationId,
        userId: context.userId,
        customerId,
        stage,
        newCurrentStage: evaluation.currentStage,
        durationMs: elapsedMs(startedAt)
      })

      return {
        customerId,
        stage,
        completed: true,
        wasAlreadyCompleted: false,
        newCurrentStage: evaluation.currentStage
      }
    } catch (error) {
      logError("Customer stage completion failed", error, {
        service: "customerWorkflowService",
        organizationId: context.organizationId,
        userId: context.userId,
        customerId,
        stage
      })
      throw new Error("Stage completion failed")
    }
  }

  if (options?.organizationId && options?.userId) {
    return execute({ organizationId: options.organizationId, userId: options.userId })
  }

  return withRequestContext(async (context) => execute(context))
}

function getStageCompletionColumn(stage: WorkflowStage): keyof {
  submission_completed: boolean
  approval_completed: boolean
  installation_completed: boolean
  closure_completed: boolean
} {
  switch (stage) {
    case "SUBMITTED": return "submission_completed"
    case "APPROVED": return "approval_completed"
    case "INSTALLATION": return "installation_completed"
    case "CLOSED": return "closure_completed"
    default: throw new Error(`No completion column for stage: ${stage}`)
  }
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
