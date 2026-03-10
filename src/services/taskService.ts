import { deleteTaskById, insertTask, queryAssignableUsers, queryTasks, queryTasksByCustomerId, updateTaskById } from "../repositories/taskRepository"
import { Database } from "../types/database.types"
import { elapsedMs, logError, logInfo, logWarn, startTimer } from "../utils/logger"
import { withRequestContext } from "../utils/withRequestContext"
import { assertValidUUID } from "../utils/validateUUID"
import { logActivity } from "./activityLogService"
import { evaluateCustomerWorkflow } from "./customerWorkflowService"

type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"]
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"]

export const getTasks = async (params = {}) => {
  const startedAt = startTimer()
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error, count } = await queryTasks(organizationId, params as never)
      logInfo("Tasks fetched", {
        service: "taskService",
        organizationId,
        userId,
        count: count ?? 0,
        durationMs: elapsedMs(startedAt)
      })
      return { data: data ?? [], error, count: count ?? 0 }
    } catch (error) {
      logError("Task fetch failed", error, { service: "taskService", organizationId, userId, durationMs: elapsedMs(startedAt) })
      throw new Error("Operation failed")
    }
  })
}

export const getAssignableTaskUsers = async () => {
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error } = await queryAssignableUsers(organizationId)
      logInfo("Assignable users fetched", { service: "taskService", organizationId, userId, count: data?.length ?? 0 })
      return { data: data ?? [], error }
    } catch (error) {
      logError("Assignable users fetch failed", error, { service: "taskService", organizationId, userId })
      throw new Error("Operation failed")
    }
  })
}

export const getTasksByCustomerId = async (customerId: string, limit = 100) => {
  assertValidUUID(customerId, "customerId")

  const startedAt = startTimer()
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error } = await queryTasksByCustomerId(organizationId, customerId, limit)
      logInfo("Customer tasks fetched", {
        service: "taskService",
        organizationId,
        userId,
        customerId,
        count: data?.length ?? 0,
        durationMs: elapsedMs(startedAt)
      })
      return { data: data ?? [], error }
    } catch (error) {
      logError("Customer tasks fetch failed", error, {
        service: "taskService",
        organizationId,
        userId,
        customerId,
        durationMs: elapsedMs(startedAt)
      })
      throw new Error("Operation failed")
    }
  })
}

export const createTask = async (payload: Omit<TaskInsert, "organization_id">) => {
  if (!payload.title?.trim()) {
    throw new Error("Operation failed")
  }

  const startedAt = startTimer()
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error } = await insertTask(organizationId, payload)
      if (!error && data) {
        await logActivity("Task created", "task", data.id, { title: data.title })
        logInfo("Task created", {
          service: "taskService",
          organizationId,
          userId,
          taskId: data.id,
          durationMs: elapsedMs(startedAt)
        })
      }
      return { data, error }
    } catch (error) {
      logError("Task create failed", error, { service: "taskService", organizationId, userId, durationMs: elapsedMs(startedAt) })
      throw new Error("Operation failed")
    }
  })
}

export const updateTask = async (id: string, payload: TaskUpdate) => {
  assertValidUUID(id, "taskId")

  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error } = await updateTaskById(id, organizationId, payload)
      if (!error) {
        await logActivity("Task updated", "task", id, { fields: Object.keys(payload) })
        if ((payload.status ?? "").toLowerCase().includes("complete") && data?.related_customer_id) {
          try {
            await evaluateCustomerWorkflow(data.related_customer_id, {
              triggerEvent: "task-completed",
              metadata: { taskId: id, title: data.title },
              organizationId,
              userId
            })
          } catch (workflowError) {
            logWarn("Workflow evaluation skipped on task completion", {
              service: "taskService",
              organizationId,
              userId,
              taskId: id,
              customerId: data.related_customer_id,
              error: workflowError instanceof Error ? workflowError.message : String(workflowError)
            })
          }
        }
        logInfo("Task updated", { service: "taskService", organizationId, userId, taskId: id })
      }
      return { data, error }
    } catch (error) {
      logError("Task update failed", error, { service: "taskService", organizationId, userId, taskId: id })
      throw new Error("Operation failed")
    }
  })
}

export const deleteTask = async (id: string) => {
  assertValidUUID(id, "taskId")

  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { error } = await deleteTaskById(id, organizationId)
      if (!error) {
        await logActivity("Task deleted", "task", id)
        logInfo("Task deleted", { service: "taskService", organizationId, userId, taskId: id })
      }
      return { error }
    } catch (error) {
      logError("Task delete failed", error, { service: "taskService", organizationId, userId, taskId: id })
      throw new Error("Operation failed")
    }
  })
}
