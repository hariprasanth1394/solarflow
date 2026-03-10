import { supabase } from "../lib/supabaseClient"
import type { Database, Json } from "../types/database.types"
import { handleRepositoryError } from "./repositoryUtils"
import { assertValidUUID } from "../utils/validateUUID"

export type WorkflowStage = "CREATED" | "SUBMITTED" | "APPROVED" | "INSTALLATION" | "CLOSED"

type CustomerWorkflowProjection = {
  id: string
  organization_id: string
  current_stage: WorkflowStage | null
}

function isWorkflowSchemaMissingError(error: { code?: string; message?: string } | null) {
  if (!error) return false
  const message = (error.message ?? "").toLowerCase()
  return (
    error.code === "42703" ||
    error.code === "42P01" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    message.includes("current_stage") ||
    message.includes("customer_progress") ||
    message.includes("related_customer_id")
  )
}

function mapStatusToStage(status: string | null | undefined): WorkflowStage {
  const normalized = (status ?? "").toLowerCase().trim()
  if (normalized.includes("closed") || normalized.includes("inactive") || normalized.includes("completed")) return "CLOSED"
  if (normalized.includes("install")) return "INSTALLATION"
  if (normalized.includes("approve")) return "APPROVED"
  if (normalized.includes("submit") || normalized.includes("gov") || normalized.includes("active")) return "SUBMITTED"
  return "CREATED"
}

type CustomerDocument = {
  id: string
  name: string
  file_type: string | null
  created_at: string
}

type CustomerTask = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
}

type ProgressInsert = {
  organization_id: string
  customer_id: string
  previous_stage: WorkflowStage | null
  current_stage: WorkflowStage
  trigger_event: string
  next_required_action: string | null
  metadata?: Record<string, unknown>
  changed_by?: string | null
}

export async function fetchCustomerWorkflowProjection(customerId: string, organizationId: string) {
  assertValidUUID(customerId, "customerId")
  assertValidUUID(organizationId, "organizationId")
  
  const withStage = await supabase
    .from("customers")
    .select("id,organization_id,current_stage")
    .eq("id", customerId)
    .eq("organization_id", organizationId)
    .single()

  if (!withStage.error) {
    return withStage.data as CustomerWorkflowProjection
  }

  if (isWorkflowSchemaMissingError(withStage.error)) {
    const legacy = await supabase
      .from("customers")
      .select("id,organization_id,status")
      .eq("id", customerId)
      .eq("organization_id", organizationId)
      .single()

    if (legacy.error) handleRepositoryError("customerWorkflowRepository", "fetchCustomerWorkflowProjection", legacy.error)

    return {
      id: legacy.data.id,
      organization_id: legacy.data.organization_id,
      current_stage: mapStatusToStage(legacy.data.status)
    }
  }

  handleRepositoryError("customerWorkflowRepository", "fetchCustomerWorkflowProjection", withStage.error)
}

export async function fetchCustomerDocuments(customerId: string, organizationId: string) {
  assertValidUUID(customerId, "customerId")
  assertValidUUID(organizationId, "organizationId")
  
  const { data, error } = await supabase
    .from("documents")
    .select("id,name,file_type,created_at")
    .eq("organization_id", organizationId)
    .eq("related_customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) handleRepositoryError("customerWorkflowRepository", "fetchCustomerDocuments", error)
  return (data ?? []) as CustomerDocument[]
}

export async function fetchCustomerTasks(customerId: string, organizationId: string) {
  assertValidUUID(customerId, "customerId")
  assertValidUUID(organizationId, "organizationId")
  
  const { data, error } = await supabase
    .from("tasks")
    .select("id,title,description,status,priority,due_date")
    .eq("organization_id", organizationId)
    .eq("related_customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    if (isWorkflowSchemaMissingError(error)) {
      return []
    }
    handleRepositoryError("customerWorkflowRepository", "fetchCustomerTasks", error)
  }
  return (data ?? []) as CustomerTask[]
}

export async function updateCustomerCurrentStage(customerId: string, organizationId: string, stage: WorkflowStage) {
  assertValidUUID(customerId, "customerId")
  assertValidUUID(organizationId, "organizationId")
  
  const { data, error } = await supabase
    .from("customers")
    .update({ current_stage: stage })
    .eq("id", customerId)
    .eq("organization_id", organizationId)
    .select("id,current_stage")
    .single()

  if (error) {
    if (isWorkflowSchemaMissingError(error)) {
      return { id: customerId, current_stage: stage }
    }
    handleRepositoryError("customerWorkflowRepository", "updateCustomerCurrentStage", error)
  }
  return data as { id: string; current_stage: WorkflowStage }
}

export async function insertCustomerProgressEntry(payload: ProgressInsert) {
  assertValidUUID(payload.organization_id, "organizationId")
  assertValidUUID(payload.customer_id, "customerId")
  
  const insertPayload: Database["public"]["Tables"]["customer_progress"]["Insert"] = {
    organization_id: payload.organization_id,
    customer_id: payload.customer_id,
    previous_stage: payload.previous_stage,
    current_stage: payload.current_stage,
    trigger_event: payload.trigger_event,
    next_required_action: payload.next_required_action,
    metadata: ((payload.metadata ?? {}) as Json),
    changed_by: payload.changed_by ?? null
  }

  const { data, error } = await supabase.from("customer_progress").insert(insertPayload).select("id,customer_id,current_stage,previous_stage,trigger_event,next_required_action,created_at").single()

  if (error) {
    if (isWorkflowSchemaMissingError(error)) {
      return null
    }
    handleRepositoryError("customerWorkflowRepository", "insertCustomerProgressEntry", error)
  }
  return data
}

export async function fetchCustomerStageHistory(customerId: string, organizationId: string, limit = 100) {
  assertValidUUID(customerId, "customerId")
  assertValidUUID(organizationId, "organizationId")
  
  const { data, error } = await supabase
    .from("customer_progress")
    .select("id,previous_stage,current_stage,trigger_event,next_required_action,metadata,created_at")
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(Math.min(200, Math.max(1, limit)))

  if (error) {
    if (isWorkflowSchemaMissingError(error)) {
      return []
    }
    handleRepositoryError("customerWorkflowRepository", "fetchCustomerStageHistory", error)
  }
  return data ?? []
}
