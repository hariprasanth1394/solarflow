"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { CircleCheck, Clock3, Loader2 } from "lucide-react"
import { formatDateTimeUTC } from "@/utils/dateFormat"
import { validateUUID } from "@/utils/validateUUID"
import { getCustomerById, getCustomerProgress, updateCustomer } from "@/services/customerService"
import { getTasksByCustomerId, createTask, getAssignableTaskUsers } from "@/services/taskService"
import { listDocumentsByCustomerId, downloadDocument, uploadDocument } from "@/services/documentService"
import { getCustomerActivityLogs } from "@/services/activityLogService"
import { getSystemAvailability } from "@/services/inventoryService"
import { consumeReservedInventoryForInstallation } from "@/services/installationInventoryService"
import WorkflowStageCard from "./workflow/WorkflowStageCard"
import WorkflowActionModal from "./workflow/WorkflowActionModal"
import type { StageDefinition, WorkflowActionKey, WorkflowBadgeTone, WorkflowStageKey } from "./workflow/types"

type CustomerRow = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  status: string
  current_stage?: string | null
  system_id?: string | null
  notes: string | null
  created_at: string
}

type TaskRow = {
  id: string
  title: string
  due_date: string | null
  priority: string
}

type DocumentRow = {
  id: string
  name: string
  file_url: string
  file_size: number | null
  created_at: string
}

type ActivityRow = {
  id: string
  action: string
  details: unknown
  created_at: string
}

type ProgressRow = {
  current_stage: string
  next_required_action: string
  stage_history: Array<{ current_stage: string; created_at: string }>
}

type SystemAvailabilityRow = {
  system_id?: string | null
  capacity_kw?: number | null
  system_name?: string | null
}

type AssigneeRow = { id: string; name: string | null; email: string | null }

type ModalState = {
  action: WorkflowActionKey | null
}

const stageDefinitions: StageDefinition[] = [
  {
    key: "CREATED",
    order: 1,
    title: "Customer Created",
    statuses: [{ value: "created", label: "Created", tone: "completed" }],
    actions: []
  },
  {
    key: "GOVERNMENT_APPROVAL",
    order: 2,
    title: "Government Approval",
    statuses: [
      { value: "pending_submission", label: "Pending Submission", tone: "pending" },
      { value: "approval_submitted", label: "Approval Submitted", tone: "inProgress" },
      { value: "government_approved", label: "Government Approved", tone: "approved" }
    ],
    actions: [
      { key: "SUBMIT_APPROVAL_DOCUMENTS", label: "Submit Approval Documents", stage: "GOVERNMENT_APPROVAL" },
      { key: "MARK_GOVERNMENT_APPROVED", label: "Mark Government Approved", stage: "GOVERNMENT_APPROVAL" }
    ]
  },
  {
    key: "INSTALLATION",
    order: 3,
    title: "Installation",
    statuses: [
      { value: "yet_to_start", label: "Yet To Start", tone: "pending" },
      { value: "in_progress", label: "In Progress", tone: "inProgress" },
      { value: "completed", label: "Completed", tone: "completed" }
    ],
    actions: [
      { key: "START_INSTALLATION", label: "Start Installation", stage: "INSTALLATION" },
      { key: "MARK_INSTALLATION_COMPLETED", label: "Mark Installation Completed", stage: "INSTALLATION" }
    ]
  },
  {
    key: "CLOSURE",
    order: 4,
    title: "Closure",
    statuses: [
      { value: "payment_pending", label: "Payment Pending", tone: "pending" },
      { value: "closed", label: "Closed", tone: "completed" }
    ],
    actions: [{ key: "CLOSE_PROJECT", label: "Close Project", stage: "CLOSURE" }]
  }
]

const primaryButtonClass =
  "rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 px-4 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"

function normalizeStageKey(input: string | null | undefined): WorkflowStageKey {
  const value = (input ?? "").toUpperCase().trim()
  if (value.includes("CLOSED") || value.includes("CLOSURE")) return "CLOSURE"
  if (value.includes("INSTALLATION")) return "INSTALLATION"
  if (value.includes("SUBMITTED") || value.includes("APPROVED") || value.includes("GOV") || value.includes("APPROVAL")) {
    return "GOVERNMENT_APPROVAL"
  }
  return "CREATED"
}

function governmentStatus(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes("approved")) return { label: "Government Approved", tone: "approved" as WorkflowBadgeTone }
  if (normalized.includes("submitted")) return { label: "Approval Submitted", tone: "inProgress" as WorkflowBadgeTone }
  return { label: "Pending Submission", tone: "pending" as WorkflowBadgeTone }
}

function installationStatus(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes("completed")) return { label: "Completed", tone: "completed" as WorkflowBadgeTone }
  if (normalized.includes("progress")) return { label: "In Progress", tone: "inProgress" as WorkflowBadgeTone }
  return { label: "Yet To Start", tone: "pending" as WorkflowBadgeTone }
}

function closureStatus(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes("closed")) return { label: "Closed", tone: "completed" as WorkflowBadgeTone }
  return { label: "Payment Pending", tone: "pending" as WorkflowBadgeTone }
}

function stageBadge(stage: WorkflowStageKey, status: string) {
  if (stage === "GOVERNMENT_APPROVAL") return governmentStatus(status)
  if (stage === "INSTALLATION") return installationStatus(status)
  if (stage === "CLOSURE") return closureStatus(status)
  return { label: "Created", tone: "completed" as WorkflowBadgeTone }
}

function formatBytes(size: number | null) {
  if (!size || size <= 0) return "-"
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

function resolveUser(details: unknown) {
  if (!details || typeof details !== "object") return "System"
  const payload = details as Record<string, unknown>
  const candidate = payload.user ?? payload.changed_by ?? payload.username ?? payload.name
  return candidate ? String(candidate) : "System"
}

export default function CustomerDetailsPage() {
  const router = useRouter()
  const params = useParams<{ id?: string | string[] }>()
  const rawId = params?.id
  const customerId = Array.isArray(rawId) ? rawId[0] : rawId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<WorkflowActionKey | null>(null)

  const [customer, setCustomer] = useState<CustomerRow | null>(null)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [progress, setProgress] = useState<ProgressRow | null>(null)
  const [systems, setSystems] = useState<SystemAvailabilityRow[]>([])
  const [assignees, setAssignees] = useState<AssigneeRow[]>([])

  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null)
  const [modalState, setModalState] = useState<ModalState>({ action: null })

  const [submissionDoc, setSubmissionDoc] = useState<File | null>(null)
  const [submissionRefNumber, setSubmissionRefNumber] = useState("")
  const [submissionNotes, setSubmissionNotes] = useState("")

  const [approvalDoc, setApprovalDoc] = useState<File | null>(null)
  const [approvalNumber, setApprovalNumber] = useState("")
  const [approvalDate, setApprovalDate] = useState("")

  const [startDate, setStartDate] = useState("")
  const [estimatedDays, setEstimatedDays] = useState("")
  const [assignedTeam, setAssignedTeam] = useState("")
  const [installationNotes, setInstallationNotes] = useState("")

  const [installCompleteNotes, setInstallCompleteNotes] = useState("")

  const [paymentStatus, setPaymentStatus] = useState("Payment Pending")
  const [invoiceDoc, setInvoiceDoc] = useState<File | null>(null)
  const [completionNotes, setCompletionNotes] = useState("")

  const loadDetail = useCallback(async () => {
    if (!customerId || !validateUUID(customerId)) {
      router.replace("/customers")
      return
    }

    setLoading(true)
    setError("")

    try {
      const [{ data: customerData }, taskResult, docResult, activityResult, progressResult, systemsResult, assigneeResult] = await Promise.all([
        getCustomerById(customerId),
        getTasksByCustomerId(customerId, 100),
        listDocumentsByCustomerId(customerId, 100),
        getCustomerActivityLogs(customerId, 100),
        getCustomerProgress(customerId, 100),
        getSystemAvailability(),
        getAssignableTaskUsers()
      ])

      if (!customerData) {
        setCustomer(null)
        setError("Customer not found")
        return
      }

      setCustomer(customerData as CustomerRow)
      setTasks((taskResult.data ?? []) as TaskRow[])
      setDocuments((docResult.data ?? []) as DocumentRow[])
      setActivities((activityResult.data ?? []) as ActivityRow[])
      setProgress((progressResult ?? null) as ProgressRow | null)
      setSystems((systemsResult.data ?? []) as SystemAvailabilityRow[])
      setAssignees((assigneeResult.data ?? []) as AssigneeRow[])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Operation failed")
      setTasks([])
      setDocuments([])
      setActivities([])
      setProgress(null)
      setSystems([])
      setAssignees([])
    } finally {
      setLoading(false)
    }
  }, [customerId, router])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const currentStage = useMemo(() => {
    return normalizeStageKey(progress?.current_stage ?? customer?.current_stage ?? customer?.status)
  }, [progress?.current_stage, customer?.current_stage, customer?.status])

  const orderedStages = useMemo(() => {
    const current = stageDefinitions.find((stage) => stage.key === currentStage)
    const rest = stageDefinitions.filter((stage) => stage.key !== currentStage)
    return current ? [current, ...rest] : stageDefinitions
  }, [currentStage])

  const systemCapacity = useMemo(() => {
    if (!customer?.system_id) return "-"
    const matched = systems.find((row) => row.system_id === customer.system_id)
    if (!matched?.capacity_kw) return "-"
    return `${matched.capacity_kw} kW`
  }, [customer?.system_id, systems])

  const progressIndex = useMemo(() => stageDefinitions.findIndex((stage) => stage.key === currentStage), [currentStage])

  const closeModal = () => {
    setModalState({ action: null })
    setSubmissionDoc(null)
    setApprovalDoc(null)
    setInvoiceDoc(null)
    setSubmissionRefNumber("")
    setSubmissionNotes("")
    setApprovalNumber("")
    setApprovalDate("")
    setStartDate("")
    setEstimatedDays("")
    setAssignedTeam("")
    setInstallationNotes("")
    setInstallCompleteNotes("")
    setPaymentStatus("Payment Pending")
    setCompletionNotes("")
  }

  const appendNotes = (base: string | null | undefined, sectionTitle: string, lines: string[]) => {
    const nextSection = [`${sectionTitle}:`, ...lines.filter(Boolean)].join("\n")
    if (!base?.trim()) return nextSection
    return `${base}\n\n${nextSection}`
  }

  const runAction = async () => {
    if (!customer || !modalState.action) return
    setActionLoading(modalState.action)
    setError("")

    try {
      if (modalState.action === "SUBMIT_APPROVAL_DOCUMENTS") {
        if (!submissionDoc || !submissionRefNumber.trim()) {
          throw new Error("Please upload document and enter reference number")
        }

        await uploadDocument(submissionDoc, "government-approval-submission", customer.id)
        await updateCustomer(customer.id, {
          status: "Approval Submitted",
          current_stage: "SUBMITTED",
          notes: appendNotes(customer.notes, "Government Approval Submission", [
            `Reference: ${submissionRefNumber}`,
            submissionNotes ? `Notes: ${submissionNotes}` : ""
          ])
        })
      }

      if (modalState.action === "MARK_GOVERNMENT_APPROVED") {
        if (!approvalDoc || !approvalNumber.trim() || !approvalDate.trim()) {
          throw new Error("Please complete all approval fields")
        }

        await uploadDocument(approvalDoc, "government-approved", customer.id)
        await updateCustomer(customer.id, {
          status: "Government Approved",
          current_stage: "APPROVED",
          notes: appendNotes(customer.notes, "Government Approval", [`Approval No: ${approvalNumber}`, `Date: ${approvalDate}`])
        })
      }

      if (modalState.action === "START_INSTALLATION") {
        if (!startDate.trim() || !estimatedDays.trim() || !assignedTeam.trim()) {
          throw new Error("Please complete all installation start fields")
        }

        const dueDate = new Date(startDate)
        dueDate.setDate(dueDate.getDate() + Number(estimatedDays || 0))

        await createTask({
          title: `Installation - ${customer.name}`,
          description: `Assigned Team: ${assignedTeam}${installationNotes ? `\nNotes: ${installationNotes}` : ""}`,
          related_customer_id: customer.id,
          status: "In Progress",
          priority: "High",
          due_date: dueDate.toISOString(),
          assigned_to: assignedTeam
        })

        await updateCustomer(customer.id, {
          status: "In Progress",
          current_stage: "INSTALLATION",
          notes: appendNotes(customer.notes, "Installation Started", [
            `Start Date: ${startDate}`,
            `Estimated Days: ${estimatedDays}`,
            `Assigned Team: ${assignedTeam}`,
            installationNotes ? `Notes: ${installationNotes}` : ""
          ])
        })

        if (customer.system_id) {
          await consumeReservedInventoryForInstallation({ customerId: customer.id, systemId: customer.system_id })
        }
      }

      if (modalState.action === "MARK_INSTALLATION_COMPLETED") {
        await updateCustomer(customer.id, {
          status: "Completed",
          current_stage: "INSTALLATION",
          notes: appendNotes(customer.notes, "Installation Completed", [installCompleteNotes || "Marked as completed"])
        })
      }

      if (modalState.action === "CLOSE_PROJECT") {
        if (!completionNotes.trim()) {
          throw new Error("Please provide completion notes")
        }

        if (invoiceDoc) {
          await uploadDocument(invoiceDoc, "project-closure-invoice", customer.id)
        }

        await updateCustomer(customer.id, {
          status: "Closed",
          current_stage: "CLOSED",
          notes: appendNotes(customer.notes, "Project Closure", [
            `Payment Status: ${paymentStatus}`,
            `Completion Notes: ${completionNotes}`
          ])
        })
      }

      closeModal()
      await loadDetail()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Operation failed")
    } finally {
      setActionLoading(null)
    }
  }

  if (!customerId) return null

  return (
    <div className="space-y-5 overflow-x-hidden">
      {loading ? (
        <section className="rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" /> Loading customer details...
          </p>
        </section>
      ) : null}

      {!loading && error === "Customer not found" ? (
        <section className="rounded-xl shadow-sm border border-gray-100 p-5 bg-amber-50">
          <p className="text-sm text-amber-800">Customer not found.</p>
          <Link href="/customers" className="mt-3 inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-amber-800">
            Back to Customers
          </Link>
        </section>
      ) : null}

      {!loading && error && error !== "Customer not found" ? (
        <section className="rounded-xl shadow-sm border border-gray-100 p-5 bg-rose-50">
          <p className="text-sm text-rose-700">{error}</p>
        </section>
      ) : null}

      {!loading && !error && customer ? (
        <>
          <section className="rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900">Customer Summary</h2>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-gray-900">{customer.name}</h1>
                <p className="text-sm text-gray-600">{customer.phone || "-"}</p>
                <p className="text-sm text-gray-600">{customer.email || "-"}</p>
                <p className="text-sm text-gray-600">{[customer.address, customer.city, customer.state, customer.country].filter(Boolean).join(", ") || "-"}</p>
              </div>

              <div className="flex flex-col items-start gap-2 lg:items-end">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">{customer.status}</span>
                <Link href={`/customers/${customer.id}/edit`} className={primaryButtonClass}>
                  Edit
                </Link>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-500">System Capacity</p>
                <p className="mt-1 text-sm font-medium text-gray-800">{systemCapacity}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-500">Created At</p>
                <p className="mt-1 text-sm font-medium text-gray-800">{formatDateTimeUTC(customer.created_at)}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-500">Current Stage</p>
                <p className="mt-1 text-sm font-medium text-gray-800">{stageDefinitions.find((item) => item.key === currentStage)?.title}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900">Workflow Progress</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {stageDefinitions.map((stage, index) => {
                const completed = index < progressIndex
                const current = index === progressIndex
                return (
                  <div key={stage.key} className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                        completed ? "border-emerald-500 bg-emerald-500 text-white" : current ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-300 bg-white text-gray-500"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className={`text-sm ${current ? "font-semibold text-gray-900" : "text-gray-500"}`}>{stage.title}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 rounded-xl border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Next Required Action</p>
              <p className="mt-1 text-sm text-gray-800">{progress?.next_required_action || "Workflow in progress"}</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Stage Cards</h2>
            {orderedStages.map((stage) => {
              const badge = stageBadge(stage.key, customer.status)
              const current = stage.key === currentStage
              const dynamicActions = stage.actions.filter((action) => {
                if (action.key === "SUBMIT_APPROVAL_DOCUMENTS") return !customer.status.toLowerCase().includes("submitted") && !customer.status.toLowerCase().includes("approved")
                if (action.key === "MARK_GOVERNMENT_APPROVED") return customer.status.toLowerCase().includes("submitted") || stage.key === currentStage
                if (action.key === "START_INSTALLATION") return !customer.status.toLowerCase().includes("in progress")
                if (action.key === "MARK_INSTALLATION_COMPLETED") return customer.status.toLowerCase().includes("progress") || stage.key === currentStage
                if (action.key === "CLOSE_PROJECT") return !customer.status.toLowerCase().includes("closed")
                return true
              })

              return (
                <WorkflowStageCard
                  key={stage.key}
                  stage={{ ...stage, actions: dynamicActions }}
                  current={current}
                  expanded={current}
                  statusLabel={badge.label}
                  statusTone={badge.tone}
                  onActionClick={(action) => setModalState({ action: action.key })}
                  loadingActionKey={actionLoading}
                />
              )
            })}
          </section>

          <section className="rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900">Related Tasks</h2>
            <div className="mt-4 hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-3 font-medium">Task title</th>
                    <th className="px-3 py-3 font-medium">Due date</th>
                    <th className="px-3 py-3 font-medium">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                        No tasks found for this customer.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-3 text-gray-700">{task.title}</td>
                        <td className="px-3 py-3 text-gray-700">{task.due_date ? formatDateTimeUTC(task.due_date) : "-"}</td>
                        <td className="px-3 py-3 text-gray-700">{task.priority}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 space-y-3 md:hidden">
              {tasks.length === 0 ? <p className="text-sm text-gray-500">No tasks found for this customer.</p> : null}
              {tasks.map((task) => (
                <article key={task.id} className="rounded-xl border border-gray-100 p-4">
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  <p className="mt-1 text-xs text-gray-600">Due: {task.due_date ? formatDateTimeUTC(task.due_date) : "-"}</p>
                  <p className="mt-1 text-xs text-gray-600">Priority: {task.priority}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            <div className="mt-4 hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-3 font-medium">File name</th>
                    <th className="px-3 py-3 font-medium">File size</th>
                    <th className="px-3 py-3 font-medium">Uploaded</th>
                    <th className="px-3 py-3 text-right font-medium">View</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                        No documents uploaded yet.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-3 text-gray-700">{doc.name}</td>
                        <td className="px-3 py-3 text-gray-700">{formatBytes(doc.file_size)}</td>
                        <td className="px-3 py-3 text-gray-700">{formatDateTimeUTC(doc.created_at)}</td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              setViewingDocumentId(doc.id)
                              try {
                                const { data } = await downloadDocument(doc.file_url)
                                if (!data) return
                                const url = URL.createObjectURL(data)
                                window.open(url, "_blank", "noopener,noreferrer")
                                setTimeout(() => URL.revokeObjectURL(url), 30000)
                              } finally {
                                setViewingDocumentId(null)
                              }
                            }}
                            disabled={viewingDocumentId === doc.id}
                            className={primaryButtonClass}
                          >
                            {viewingDocumentId === doc.id ? "Opening..." : "View"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 space-y-3 md:hidden">
              {documents.length === 0 ? <p className="text-sm text-gray-500">No documents uploaded yet.</p> : null}
              {documents.map((doc) => (
                <article key={doc.id} className="rounded-xl border border-gray-100 p-4">
                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                  <p className="mt-1 text-xs text-gray-600">Size: {formatBytes(doc.file_size)}</p>
                  <p className="mt-1 text-xs text-gray-600">Uploaded: {formatDateTimeUTC(doc.created_at)}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900">Activity Timeline</h2>
            <div className="mt-4 space-y-3">
              {activities.length === 0 ? (
                <p className="text-sm text-gray-500">No activity found for this customer.</p>
              ) : (
                activities.map((activity) => (
                  <article key={activity.id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <p className="text-sm font-medium text-gray-800">{activity.action}</p>
                      <p className="text-xs text-gray-500">{formatDateTimeUTC(activity.created_at)}</p>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">User: {resolveUser(activity.details)}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}

      <WorkflowActionModal
        open={modalState.action === "SUBMIT_APPROVAL_DOCUMENTS"}
        title="Submit Approval Documents"
        loading={actionLoading === "SUBMIT_APPROVAL_DOCUMENTS"}
        onClose={closeModal}
        onSubmit={() => void runAction()}
      >
        <div className="space-y-3">
          <label className="block text-sm text-gray-700">Document upload</label>
          <input type="file" onChange={(event) => setSubmissionDoc(event.target.files?.[0] ?? null)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <label className="block text-sm text-gray-700">Reference number</label>
          <input value={submissionRefNumber} onChange={(event) => setSubmissionRefNumber(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <label className="block text-sm text-gray-700">Notes</label>
          <textarea value={submissionNotes} onChange={(event) => setSubmissionNotes(event.target.value)} rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
      </WorkflowActionModal>

      <WorkflowActionModal
        open={modalState.action === "MARK_GOVERNMENT_APPROVED"}
        title="Mark Government Approved"
        loading={actionLoading === "MARK_GOVERNMENT_APPROVED"}
        onClose={closeModal}
        onSubmit={() => void runAction()}
      >
        <div className="space-y-3">
          <label className="block text-sm text-gray-700">Upload approval document</label>
          <input type="file" onChange={(event) => setApprovalDoc(event.target.files?.[0] ?? null)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <label className="block text-sm text-gray-700">Approval number</label>
          <input value={approvalNumber} onChange={(event) => setApprovalNumber(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <label className="block text-sm text-gray-700">Date</label>
          <input type="date" value={approvalDate} onChange={(event) => setApprovalDate(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
      </WorkflowActionModal>

      <WorkflowActionModal
        open={modalState.action === "START_INSTALLATION"}
        title="Start Installation"
        loading={actionLoading === "START_INSTALLATION"}
        onClose={closeModal}
        onSubmit={() => void runAction()}
      >
        <div className="space-y-3">
          <label className="block text-sm text-gray-700">Start date</label>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <label className="block text-sm text-gray-700">Estimated completion days</label>
          <input type="number" min={1} value={estimatedDays} onChange={(event) => setEstimatedDays(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <label className="block text-sm text-gray-700">Assigned team</label>
          <select value={assignedTeam} onChange={(event) => setAssignedTeam(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">Select team member</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name || assignee.email || assignee.id}
              </option>
            ))}
          </select>
          <label className="block text-sm text-gray-700">Notes</label>
          <textarea value={installationNotes} onChange={(event) => setInstallationNotes(event.target.value)} rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
      </WorkflowActionModal>

      <WorkflowActionModal
        open={modalState.action === "MARK_INSTALLATION_COMPLETED"}
        title="Mark Installation Completed"
        loading={actionLoading === "MARK_INSTALLATION_COMPLETED"}
        onClose={closeModal}
        onSubmit={() => void runAction()}
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700 flex items-center gap-2">
            <CircleCheck size={16} className="text-emerald-600" /> Complete installation for this customer.
          </div>
          <label className="block text-sm text-gray-700">Completion notes</label>
          <textarea value={installCompleteNotes} onChange={(event) => setInstallCompleteNotes(event.target.value)} rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
      </WorkflowActionModal>

      <WorkflowActionModal
        open={modalState.action === "CLOSE_PROJECT"}
        title="Close Project"
        loading={actionLoading === "CLOSE_PROJECT"}
        onClose={closeModal}
        onSubmit={() => void runAction()}
      >
        <div className="space-y-3">
          <label className="block text-sm text-gray-700">Payment status</label>
          <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="Payment Pending">Payment Pending</option>
            <option value="Paid">Paid</option>
          </select>
          <label className="block text-sm text-gray-700">Invoice upload</label>
          <input type="file" onChange={(event) => setInvoiceDoc(event.target.files?.[0] ?? null)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <label className="block text-sm text-gray-700">Completion notes</label>
          <textarea value={completionNotes} onChange={(event) => setCompletionNotes(event.target.value)} rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700 flex items-center gap-2">
            <Clock3 size={16} className="text-blue-600" /> Project will be marked as closed.
          </div>
        </div>
      </WorkflowActionModal>
    </div>
  )
}
