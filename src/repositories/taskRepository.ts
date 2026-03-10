import { supabase } from "../lib/supabaseClient"
import { Database } from "../types/database.types"
import { handleRepositoryError } from "./repositoryUtils"
import { assertValidUUID } from "../utils/validateUUID"

type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"]
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"]

const TASK_RETURN_COLUMNS = "id,title,description,status,priority,assigned_to,related_customer_id,due_date,created_at"

export const queryTasks = async (
  organizationId: string,
  {
    search = "",
    page = 1,
    pageSize = 10,
    status
  }: {
    search?: string
    page?: number
    pageSize?: number
    status?: string
  } = {}
) => {
  const safePage = Math.max(1, page)
  const safePageSize = Math.min(100, Math.max(1, pageSize))
  const from = (safePage - 1) * safePageSize
  const to = from + safePageSize - 1

  let query = supabase
    .from("tasks")
    .select("id,title,description,status,priority,assigned_to,related_customer_id,due_date,created_at", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("due_date", { ascending: true })

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  if (status && status !== "All") {
    query = query.eq("status", status)
  }

  const response = await query.range(from, to)
  if (response.error) {
    handleRepositoryError("taskRepository", "queryTasks", response.error)
  }
  return response
}

export const insertTask = async (organizationId: string, payload: Omit<TaskInsert, "organization_id">) => {
  const response = await supabase
    .from("tasks")
    .insert([{ ...payload, organization_id: organizationId } as TaskInsert])
    .select(TASK_RETURN_COLUMNS)
    .single()
  if (response.error) {
    handleRepositoryError("taskRepository", "insertTask", response.error)
  }
  return response
}

export const updateTaskById = async (id: string, organizationId: string, payload: TaskUpdate) => {
  assertValidUUID(id, "taskId")
  assertValidUUID(organizationId, "organizationId")
  
  const response = await supabase
    .from("tasks")
    .update(payload)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select(TASK_RETURN_COLUMNS)
    .single()
  if (response.error) {
    handleRepositoryError("taskRepository", "updateTaskById", response.error)
  }
  return response
}

export const deleteTaskById = async (id: string, organizationId: string) => {
  assertValidUUID(id, "taskId")
  assertValidUUID(organizationId, "organizationId")
  
  const response = await supabase.from("tasks").delete().eq("id", id).eq("organization_id", organizationId)
  if (response.error) {
    handleRepositoryError("taskRepository", "deleteTaskById", response.error)
  }
  return response
}

export const queryAssignableUsers = async (organizationId: string) => {
  const response = await supabase
    .from("users")
    .select("id,name,email")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true })

  if (response.error) {
    handleRepositoryError("taskRepository", "queryAssignableUsers", response.error)
  }

  return response
}

export const queryTasksByCustomerId = async (organizationId: string, customerId: string, limit = 100) => {
  assertValidUUID(organizationId, "organizationId")
  assertValidUUID(customerId, "customerId")
  
  const safeLimit = Math.min(200, Math.max(1, limit))
  const response = await supabase
    .from("tasks")
    .select(TASK_RETURN_COLUMNS)
    .eq("organization_id", organizationId)
    .eq("related_customer_id", customerId)
    .order("created_at", { ascending: false })
    .order("due_date", { ascending: true })
    .limit(safeLimit)

  if (response.error) {
    handleRepositoryError("taskRepository", "queryTasksByCustomerId", response.error)
  }

  return response
}
