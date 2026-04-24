"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Check, CircleCheck, Clock3, CreditCard, FileText, Loader2, Pencil, Plus, Upload, Zap } from "lucide-react"
import { formatDateTimeUTC } from "@/utils/dateFormat"
import { validateUUID } from "@/utils/validateUUID"
import { getCustomerById, getCustomerProgress, updateCustomer } from "@/services/customerService"
import { getTasksByCustomerId, createTask, getAssignableTaskUsers } from "@/services/taskService"
import { listDocumentsByCustomerId, downloadDocument, uploadDocument } from "@/services/documentService"
import { getCustomerActivityLogs } from "@/services/activityLogService"
import { getSystemAvailability } from "@/services/inventoryService"
import { consumeReservedInventoryForInstallation } from "@/services/installationInventoryService"
import WorkflowStageCard from "./workflow/WorkflowStageCard"
import FileDropInput from "./workflow/FileDropInput"
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

type WorkflowStageValue = "CREATED" | "SUBMITTED" | "APPROVED" | "INSTALLATION" | "CLOSED"

type PaymentModel = {
  total: number
  paid: number
  remaining: number
  status: "Pending" | "Partial" | "Paid"
}

type AllowedActionModel = {
  allowedActions: WorkflowActionKey[]
  primaryAction: WorkflowActionKey | null
  guidance: string
  closureEnabled: boolean
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
      { key: "SUBMIT_APPROVAL_DOCUMENTS", label: "Submit for Approval", stage: "GOVERNMENT_APPROVAL" },
      { key: "MARK_GOVERNMENT_APPROVED", label: "Approve & Continue", stage: "GOVERNMENT_APPROVAL" }
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
      { key: "MARK_INSTALLATION_COMPLETED", label: "Complete Installation", stage: "INSTALLATION" }
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
    actions: [{ key: "CLOSE_PROJECT", label: "Close & Archive", stage: "CLOSURE" }]
  }
]

function normalizeStageKey(input: string | null | undefined): WorkflowStageKey {
  const value = (input ?? "").toUpperCase().trim()
  if (value.includes("CLOSED") || value.includes("CLOSURE")) return "CLOSURE"
  if (value.includes("INSTALLATION") || value.includes("APPROVED")) return "INSTALLATION"
  if (value.includes("SUBMITTED") || value.includes("GOV") || value.includes("APPROVAL")) {
    return "GOVERNMENT_APPROVAL"
  }
  return "CREATED"
}

function normalizeWorkflowStage(input: string | null | undefined): WorkflowStageValue {
  const value = (input ?? "").toUpperCase().trim()
  if (value.includes("CLOSED") || value.includes("CLOSURE")) return "CLOSED"
  if (value.includes("INSTALLATION")) return "INSTALLATION"
  if (value.includes("APPROVED")) return "APPROVED"
  if (value.includes("SUBMITTED") || value.includes("GOV") || value.includes("APPROVAL")) return "SUBMITTED"
  return "CREATED"
}

function governmentStatus(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes("approved")) return { label: "Approved", tone: "approved" as WorkflowBadgeTone }
  if (normalized.includes("progress")) return { label: "In Progress", tone: "inProgress" as WorkflowBadgeTone }
  return { label: "Pending", tone: "pending" as WorkflowBadgeTone }
}

function installationStatus(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes("payment pending") || normalized.includes("partial payment")) {
    return { label: "Payment Pending", tone: "pending" as WorkflowBadgeTone }
  }
  if (normalized.includes("completed")) return { label: "Completed", tone: "completed" as WorkflowBadgeTone }
  if (normalized.includes("progress")) return { label: "In Progress", tone: "inProgress" as WorkflowBadgeTone }
  if (normalized.includes("approved")) return { label: "Approved", tone: "approved" as WorkflowBadgeTone }
  return { label: "Pending", tone: "pending" as WorkflowBadgeTone }
}

function closureStatus(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes("completed_payment_pending") || normalized.includes("payment pending") || normalized.includes("partial")) {
    return { label: "Payment Pending", tone: "pending" as WorkflowBadgeTone }
  }
  if (normalized.includes("completed") || normalized.includes("closed") || normalized.includes("paid")) {
    return { label: "Completed", tone: "completed" as WorkflowBadgeTone }
  }
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

function parseAmountFromNotes(notes: string | null | undefined, key: string) {
  const matches = Array.from((notes ?? "").matchAll(new RegExp(`${key}:\\s*([0-9]+(?:\\.[0-9]+)?)`, "gi")))
  if (!matches.length) return 0
  const last = matches[matches.length - 1]?.[1]
  return last ? Number(last) : 0
}

function parsePaymentStatusFromNotes(notes: string | null | undefined) {
  const matches = Array.from((notes ?? "").matchAll(/Payment Status:\s*([^\n]+)/gi))
  const last = matches[matches.length - 1]?.[1]
  const normalized = last?.trim().toLowerCase() ?? "pending"
  if (normalized === "paid") return "Paid"
  if (normalized.includes("partial")) return "Partial"
  return "Pending"
}

function normalizeWorkflowStatus(status: string | null | undefined) {
  const value = (status ?? "").toLowerCase().trim()
  if (!value) return "NOT_STARTED"
  if (value.includes("approval submitted")) return "APPROVAL_SUBMITTED"
  if (value.includes("approved")) return "APPROVED"
  if (value.includes("in progress")) return "IN_PROGRESS"
  if (value.includes("completed_payment_pending") || value.includes("payment pending") || value.includes("partial")) {
    return "COMPLETED_PAYMENT_PENDING"
  }
  if (value.includes("completed") || value.includes("closed")) return "COMPLETED"
  if (value.includes("not started")) return "NOT_STARTED"
  return "NOT_STARTED"
}

function actionMeta(action: WorkflowActionKey) {
  if (action === "SUBMIT_APPROVAL_DOCUMENTS") {
    return {
      label: "Submit for Approval",
      description: "Upload government submission documents to move this customer forward."
    }
  }
  if (action === "MARK_GOVERNMENT_APPROVED") {
    return {
      label: "Approve & Continue",
      description: "Approval evidence is ready. Confirm approval to unlock installation."
    }
  }
  if (action === "START_INSTALLATION") {
    return {
      label: "Start Installation",
      description: "Assign the installation team and start execution."
    }
  }
  if (action === "MARK_INSTALLATION_COMPLETED") {
    return {
      label: "Mark Installation Done",
      description: "Capture completion and payment totals to determine closure readiness."
    }
  }
  return {
    label: "Update Payment",
    description: "Finalize payment and close the project once dues are cleared."
  }
}

function getAllowedActions(stage: WorkflowStageValue, status: string, payment: PaymentModel): AllowedActionModel {
  const normalizedStatus = normalizeWorkflowStatus(status)
  const closureEnabled = payment.remaining <= 0 && payment.total > 0

  if (stage === "CREATED") {
    return {
      allowedActions: ["SUBMIT_APPROVAL_DOCUMENTS"],
      primaryAction: "SUBMIT_APPROVAL_DOCUMENTS",
      guidance: "Upload submission documents to begin government approval.",
      closureEnabled: false
    }
  }

  if (stage === "SUBMITTED") {
    const action = normalizedStatus === "APPROVAL_SUBMITTED" ? "MARK_GOVERNMENT_APPROVED" : "SUBMIT_APPROVAL_DOCUMENTS"
    return {
      allowedActions: [action],
      primaryAction: action,
      guidance:
        action === "MARK_GOVERNMENT_APPROVED"
          ? "Documents are submitted. Approve to move into installation."
          : "Submission details are incomplete. Re-submit approval package.",
      closureEnabled: false
    }
  }

  if (stage === "APPROVED") {
    if (normalizedStatus !== "NOT_STARTED" && normalizedStatus !== "APPROVED") {
      return {
        allowedActions: [],
        primaryAction: null,
        guidance: "Installation can be started only when status is Not Started or Approved.",
        closureEnabled: false
      }
    }
    return {
      allowedActions: ["START_INSTALLATION"],
      primaryAction: "START_INSTALLATION",
      guidance: "Customer is approved. Start installation to continue the workflow.",
      closureEnabled: false
    }
  }

  if (stage === "INSTALLATION") {
    if (normalizedStatus === "NOT_STARTED" || normalizedStatus === "APPROVED") {
      return {
        allowedActions: ["START_INSTALLATION"],
        primaryAction: "START_INSTALLATION",
        guidance: "Installation has not started yet.",
        closureEnabled: false
      }
    }

    if (normalizedStatus === "IN_PROGRESS") {
      return {
        allowedActions: ["MARK_INSTALLATION_COMPLETED"],
        primaryAction: "MARK_INSTALLATION_COMPLETED",
        guidance: "Installation is in progress. Mark it done when field work is complete.",
        closureEnabled: false
      }
    }

    if (normalizedStatus === "COMPLETED_PAYMENT_PENDING") {
      return {
        allowedActions: ["CLOSE_PROJECT"],
        primaryAction: null,
        guidance: `Rs ${payment.remaining.toFixed(2)} remaining to complete project closure.`,
        closureEnabled: false
      }
    }

    if (normalizedStatus === "COMPLETED") {
      return {
        allowedActions: closureEnabled ? ["CLOSE_PROJECT"] : [],
        primaryAction: closureEnabled ? "CLOSE_PROJECT" : null,
        guidance: closureEnabled
          ? "Payment complete. Use Update Payment to finalize closure."
          : `Rs ${payment.remaining.toFixed(2)} remaining to complete project closure.`,
        closureEnabled
      }
    }
  }

  return {
    allowedActions: [],
    primaryAction: null,
    guidance: "Project is closed and no further actions are required.",
    closureEnabled: true
  }
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

  const [expandedStageKey, setExpandedStageKey] = useState<WorkflowStageKey | null>(null)
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null)
  const [modalState, setModalState] = useState<ModalState>({ action: null })
  const [modalError, setModalError] = useState("")
  const [modalRetryable, setModalRetryable] = useState(false)
  const [modalAttempted, setModalAttempted] = useState(false)
  const [statusToast, setStatusToast] = useState("")
  const [statusChipPulse, setStatusChipPulse] = useState(false)
  const [actionProgressMessage, setActionProgressMessage] = useState("")

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
  const [installationTotalAmount, setInstallationTotalAmount] = useState("")
  const [installationPaidAmount, setInstallationPaidAmount] = useState("")

  const [installCompleteNotes, setInstallCompleteNotes] = useState("")

  const [totalAmount, setTotalAmount] = useState("")
  const [paidAmount, setPaidAmount] = useState("")
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

  const currentWorkflowStage = useMemo(() => {
    return normalizeWorkflowStage(progress?.current_stage ?? customer?.current_stage ?? "CREATED")
  }, [progress?.current_stage, customer?.current_stage])

  const currentStage = useMemo(() => {
    return normalizeStageKey(currentWorkflowStage)
  }, [currentWorkflowStage])

  const orderedStages = stageDefinitions

  const systemCapacity = useMemo(() => {
    if (!customer?.system_id) return "-"
    const matched = systems.find((row) => row.system_id === customer.system_id)
    if (!matched?.capacity_kw) return "-"
    return `${matched.capacity_kw} kW`
  }, [customer?.system_id, systems])

  const progressIndex = useMemo(() => stageDefinitions.findIndex((stage) => stage.key === currentStage), [currentStage])

  useEffect(() => {
    if (!loading) setExpandedStageKey(currentStage)
  }, [loading, currentStage])

  useEffect(() => {
    if (loading) return
    setStatusChipPulse(true)
    const timer = window.setTimeout(() => setStatusChipPulse(false), 220)
    return () => window.clearTimeout(timer)
  }, [currentStage, loading])

  useEffect(() => {
    if (!statusToast) return
    const timer = window.setTimeout(() => setStatusToast(""), 2200)
    return () => window.clearTimeout(timer)
  }, [statusToast])

  function headerStageBadge(stage: WorkflowStageKey) {
    if (stage === "CLOSURE") return "bg-emerald-50 text-emerald-700"
    if (stage === "INSTALLATION") return "bg-blue-50 text-blue-700"
    if (stage === "GOVERNMENT_APPROVAL") return "bg-amber-50 text-amber-700"
    return "bg-slate-100 text-slate-600"
  }

  const closeModal = () => {
    setModalState({ action: null })
    setModalError("")
    setModalRetryable(false)
    setModalAttempted(false)
    setActionProgressMessage("")
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
    setInstallationTotalAmount("")
    setInstallationPaidAmount("")
    setInstallCompleteNotes("")
    setTotalAmount("")
    setPaidAmount("")
    setCompletionNotes("")
  }

  const openActionModal = (action: WorkflowActionKey) => {
    setModalError("")
    setModalRetryable(false)
    setModalAttempted(false)

    if (action === "CLOSE_PROJECT") {
      const capturedTotal = parseAmountFromNotes(customer?.notes, "Total Amount")
      const capturedPaid = parseAmountFromNotes(customer?.notes, "Paid Amount")
      setTotalAmount(capturedTotal > 0 ? capturedTotal.toFixed(2) : "")
      setPaidAmount(capturedPaid > 0 ? capturedPaid.toFixed(2) : "0.00")
    }

    setModalState({ action })
  }

  const textFieldClass =
    "h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
  const areaFieldClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"

  function modalStageLabel(action: WorkflowActionKey | null) {
    if (action === "SUBMIT_APPROVAL_DOCUMENTS" || action === "MARK_GOVERNMENT_APPROVED") return "Government Approval"
    if (action === "START_INSTALLATION" || action === "MARK_INSTALLATION_COMPLETED") return "Installation"
    if (action === "CLOSE_PROJECT") return "Closure"
    return stageDefinitions.find((stage) => stage.key === currentStage)?.title ?? "Workflow"
  }

  const totalAmountValue = Number(totalAmount || 0)
  const paidAmountValue = Number(paidAmount || 0)
  const remainingAmountValue = Math.max(totalAmountValue - paidAmountValue, 0)
  const autoPaymentStatus =
    totalAmountValue <= 0 || paidAmountValue <= 0
      ? "Pending"
      : paidAmountValue < totalAmountValue
      ? "Partial"
      : "Paid"

  const approvalDateValid = !approvalDate.trim() || !Number.isNaN(new Date(approvalDate).getTime())
  const approvalNumberPattern = /^[A-Za-z0-9/-]{4,40}$/
  const approvalNumberValid = !approvalNumber.trim() || approvalNumberPattern.test(approvalNumber.trim())
  const submissionReferencePattern = /^[A-Za-z0-9/-]{4,40}$/
  const submissionReferenceValid = !submissionRefNumber.trim() || submissionReferencePattern.test(submissionRefNumber.trim())
  const paymentAmountValid = !Number.isNaN(totalAmountValue) && !Number.isNaN(paidAmountValue) && paidAmountValue <= totalAmountValue
  const installationTotalAmountValue = Number(installationTotalAmount || 0)
  const installationPaidAmountValue = Number(installationPaidAmount || 0)
  const installationPaymentValid =
    !Number.isNaN(installationTotalAmountValue) &&
    !Number.isNaN(installationPaidAmountValue) &&
    installationTotalAmountValue > 0 &&
    installationPaidAmountValue <= installationTotalAmountValue

  const persistedTotalAmount = parseAmountFromNotes(customer?.notes, "Total Amount")
  const persistedPaidAmount = parseAmountFromNotes(customer?.notes, "Paid Amount")
  const persistedRemainingAmount = Math.max(persistedTotalAmount - persistedPaidAmount, 0)
  const persistedPaymentStatus = parsePaymentStatusFromNotes(customer?.notes)
  const paymentProgressPct = persistedTotalAmount > 0 ? Math.min(100, (persistedPaidAmount / persistedTotalAmount) * 100) : 0

  const paymentModel = useMemo<PaymentModel>(() => {
    return {
      total: persistedTotalAmount,
      paid: persistedPaidAmount,
      remaining: persistedRemainingAmount,
      status: persistedPaymentStatus === "Paid" ? "Paid" : persistedPaymentStatus === "Partial" ? "Partial" : "Pending"
    }
  }, [persistedTotalAmount, persistedPaidAmount, persistedRemainingAmount, persistedPaymentStatus])

  const allowedActionModel = useMemo(() => {
    return getAllowedActions(currentWorkflowStage, customer?.status ?? "", paymentModel)
  }, [currentWorkflowStage, customer?.status, paymentModel])

  const nextActionInfo = useMemo(() => {
    if (!allowedActionModel.primaryAction) return null
    const meta = actionMeta(allowedActionModel.primaryAction)
    return { key: allowedActionModel.primaryAction, label: meta.label, description: meta.description }
  }, [allowedActionModel])

  const canUpdatePayment = allowedActionModel.allowedActions.includes("CLOSE_PROJECT")

  const appendNotes = (base: string | null | undefined, sectionTitle: string, lines: string[]) => {
    const nextSection = [`${sectionTitle}:`, ...lines.filter(Boolean)].join("\n")
    if (!base?.trim()) return nextSection
    return `${base}\n\n${nextSection}`
  }

  const isRetryableError = (message: string) => {
    const normalized = message.toLowerCase()
    return (
      normalized.includes("network") ||
      normalized.includes("fetch") ||
      normalized.includes("timeout") ||
      normalized.includes("tempor") ||
      normalized.includes("failed to") ||
      normalized.includes("operation failed")
    )
  }

  const normalizeActionError = (message: string) => {
    const normalized = message.toLowerCase()
    if (normalized.includes("approved stage requires approved status")) {
      return "Status must be Government Approved before moving to the Approved stage."
    }
    if (normalized.includes("approval document reference is required")) {
      return "Add a valid Approval number or Submission reference before continuing."
    }
    if (normalized.includes("cannot move to closure without full payment")) {
      return "Full payment is required before closure. Update payment details and retry."
    }
    if (normalized.includes("cannot move backward")) {
      return "This action would move the workflow backward. Check current stage and retry."
    }
    if (normalized.includes("is not allowed") || normalized.includes("invalid workflow transition")) {
      return "This stage transition is not allowed right now. Refresh and complete the current required action first."
    }
    return message
  }

  const runWithRetry = async <T,>(operation: () => Promise<T>) => {
    let lastError: unknown
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        const message = error instanceof Error ? error.message : "Operation failed"
        if (!isRetryableError(message) || attempt === 1) {
          throw error
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Operation failed")
  }

  const runAction = async () => {
    if (!customer || !modalState.action) return
    setModalAttempted(true)

    if (modalState.action === "MARK_GOVERNMENT_APPROVED" && !approvalDateValid) {
      setModalError("Enter valid date")
      return
    }

    if (modalState.action === "MARK_GOVERNMENT_APPROVED" && !approvalNumberValid) {
      setModalError("Approval number format is invalid. Use 4-40 characters (letters, numbers, / or -).")
      return
    }

    if (modalState.action === "SUBMIT_APPROVAL_DOCUMENTS" && !submissionReferenceValid) {
      setModalError("Reference number format is invalid. Use 4-40 characters (letters, numbers, / or -).")
      return
    }

    if (modalState.action === "CLOSE_PROJECT" && totalAmountValue <= 0) {
      setModalError("Total amount is required to update payment.")
      return
    }

    if (modalState.action === "CLOSE_PROJECT" && !paymentAmountValid) {
      setModalError("Paid amount cannot be greater than total amount.")
      return
    }

    if (modalState.action === "MARK_INSTALLATION_COMPLETED" && !installationPaymentValid) {
      setModalError("Enter valid installation payment amounts")
      return
    }

    setActionLoading(modalState.action)
    setError("")
    setModalError("")
    setModalRetryable(false)

    const applyLocalStage = (status: string, stage: string) => {
      setCustomer((prev) => (prev ? { ...prev, status, current_stage: stage } : prev))
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              current_stage: stage,
            }
          : prev
      )
      setStatusToast("Status updated successfully")
    }

    try {
      if (modalState.action === "SUBMIT_APPROVAL_DOCUMENTS") {
        if (!submissionDoc || !submissionRefNumber.trim()) {
          throw new Error("Please upload document and enter reference number")
        }

        setActionProgressMessage("Uploading document...")
        await runWithRetry(() => uploadDocument(submissionDoc, "government-approval-submission", customer.id))
        setActionProgressMessage("Validating data...")
        await runWithRetry(() =>
          updateCustomer(customer.id, {
            status: "Approval Submitted",
            current_stage: "SUBMITTED",
            notes: appendNotes(customer.notes, "Government Approval Submission", [
              `Reference: ${submissionRefNumber}`,
              submissionNotes ? `Notes: ${submissionNotes}` : ""
            ])
          })
        )
        setActionProgressMessage("Updating workflow...")
        applyLocalStage("Approval Submitted", "SUBMITTED")
        setStatusToast("Approval submitted successfully")
      }

      if (modalState.action === "MARK_GOVERNMENT_APPROVED") {
        if (!approvalDoc || !approvalNumber.trim() || !approvalDate.trim()) {
          throw new Error("Please complete all approval fields")
        }

        setActionProgressMessage("Uploading document...")
        await runWithRetry(() => uploadDocument(approvalDoc, "government-approved", customer.id))
        setActionProgressMessage("Validating data...")
        await runWithRetry(() =>
          updateCustomer(customer.id, {
            status: "Government Approved",
            current_stage: "APPROVED",
            notes: appendNotes(customer.notes, "Government Approval", [`Approval No: ${approvalNumber}`, `Date: ${approvalDate}`])
          })
        )
        setActionProgressMessage("Updating workflow...")
        applyLocalStage("Government Approved", "APPROVED")
        setStatusToast("Status updated successfully")
      }

      if (modalState.action === "START_INSTALLATION") {
        if (!startDate.trim() || !estimatedDays.trim() || !assignedTeam.trim()) {
          throw new Error("Please complete all installation start fields")
        }

        const dueDate = new Date(startDate)
        dueDate.setDate(dueDate.getDate() + Number(estimatedDays || 0))

        setActionProgressMessage("Validating data...")
        await runWithRetry(() =>
          createTask({
            title: `Installation - ${customer.name}`,
            description: `Assigned Team: ${assignedTeam}${installationNotes ? `\nNotes: ${installationNotes}` : ""}`,
            related_customer_id: customer.id,
            status: "in_progress",
            priority: "high",
            due_date: dueDate.toISOString(),
            assigned_to: assignedTeam
          })
        )

        setActionProgressMessage("Updating workflow...")
        await runWithRetry(() =>
          updateCustomer(customer.id, {
            status: "In Progress",
            current_stage: "INSTALLATION",
            notes: appendNotes(customer.notes, "Installation Started", [
              `Start Date: ${startDate}`,
              `Estimated Days: ${estimatedDays}`,
              `Assigned Team: ${assignedTeam}`,
              installationNotes ? `Notes: ${installationNotes}` : ""
            ])
          })
        )
        applyLocalStage("In Progress", "INSTALLATION")
        setStatusToast("Status updated successfully")

        if (customer.system_id) {
          try {
            setActionProgressMessage("Updating workflow...")
            await consumeReservedInventoryForInstallation({ customerId: customer.id, systemId: customer.system_id })
          } catch (inventoryError) {
            console.warn("Installation inventory sync skipped", inventoryError)
          }
        }
      }

      if (modalState.action === "MARK_INSTALLATION_COMPLETED") {
        setActionProgressMessage("Updating workflow...")
        const installationPaymentStatus =
          installationPaidAmountValue <= 0
            ? "Pending"
            : installationPaidAmountValue < installationTotalAmountValue
            ? "Partial"
            : "Paid"

        const nextStage = installationPaidAmountValue >= installationTotalAmountValue ? "CLOSED" : "INSTALLATION"
        const nextStatus =
          installationPaidAmountValue >= installationTotalAmountValue
            ? "Completed"
            : "Completed_Payment_Pending"

        await runWithRetry(() =>
          updateCustomer(customer.id, {
            status: nextStatus,
            current_stage: nextStage,
            notes: appendNotes(customer.notes, "Installation Completed", [
              installCompleteNotes || "Marked as completed",
              `Total Amount: ${installationTotalAmountValue.toFixed(2)}`,
              `Paid Amount: ${installationPaidAmountValue.toFixed(2)}`,
              `Remaining Amount: ${(installationTotalAmountValue - installationPaidAmountValue).toFixed(2)}`,
              `Payment Status: ${installationPaymentStatus}`,
            ])
          })
        )
        applyLocalStage(nextStatus, nextStage)
        setStatusToast("Status updated successfully")
      }

      if (modalState.action === "CLOSE_PROJECT") {
        if (!completionNotes.trim()) {
          throw new Error("Please provide completion notes before updating payment.")
        }

        if (paidAmountValue < totalAmountValue) {
          throw new Error(`Cannot close project: Rs ${remainingAmountValue.toFixed(2)} is still pending.`)
        }

        if (invoiceDoc) {
          setActionProgressMessage("Uploading document...")
          await runWithRetry(() => uploadDocument(invoiceDoc, "project-closure-invoice", customer.id))
        }

        setActionProgressMessage("Validating data...")
        await runWithRetry(() =>
          updateCustomer(customer.id, {
            status: "Completed",
            current_stage: "CLOSED",
            notes: appendNotes(customer.notes, "Project Closure", [
              `Payment Status: ${autoPaymentStatus}`,
              `Total Amount: ${totalAmountValue.toFixed(2)}`,
              `Paid Amount: ${paidAmountValue.toFixed(2)}`,
              `Remaining Amount: ${remainingAmountValue.toFixed(2)}`,
              `Completion Notes: ${completionNotes}`
            ])
          })
        )
        setActionProgressMessage("Updating workflow...")
        applyLocalStage("Completed", "CLOSED")
        setStatusToast("Status updated successfully")
      }

      closeModal()
      await loadDetail()
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Operation failed"
      setModalError(normalizeActionError(message))
      setModalRetryable(isRetryableError(message))
      queueMicrotask(() => {
        void loadDetail()
      })
    } finally {
      setActionLoading(null)
      setActionProgressMessage("")
    }
  }

  if (!customerId) return null

  const customerLocation = [customer?.city, customer?.state, customer?.country].filter(Boolean).join(", ") || customer?.address || ""

  return (
    <div className="w-full space-y-5">
      {statusToast ? (
        <div className="fixed right-5 top-5 z-50 flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-700 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
          <Check className="h-4 w-4" />
          {statusToast}
        </div>
      ) : null}

      <Link href="/customers" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800">
        <span aria-hidden>←</span>
        Back to Customers
      </Link>

      {/* ── Loading ── */}
      {loading ? (
        <div className="flex items-center gap-2.5 rounded-lg bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading customer details…
        </div>
      ) : null}

      {/* ── Not found ── */}
      {!loading && error === "Customer not found" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-800">Customer not found.</p>
          <Link href="/customers" className="mt-3 inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-amber-800">
            ← Back to Customers
          </Link>
        </div>
      ) : null}

      {/* ── Error ── */}
      {!loading && error && error !== "Customer not found" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {!loading && !error && customer ? (
        <>
          {/* ══════════════════════════════════════════
               HEADER
          ══════════════════════════════════════════ */}
          <div className="rounded-lg bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            {/* Row 1 */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-[22px] font-semibold leading-tight text-slate-900">{customer.name}</h1>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                  {customer.phone ? <span>{customer.phone}</span> : null}
                  {customer.phone && customer.email ? <span className="text-slate-300">•</span> : null}
                  {customer.email ? <span>{customer.email}</span> : null}
                  {(customer.phone || customer.email) && customerLocation ? <span className="text-slate-300">•</span> : null}
                  {customerLocation ? <span>{customerLocation}</span> : null}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <span className={`inline-flex items-center rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-all duration-200 ${headerStageBadge(currentStage)} ${statusChipPulse ? "scale-[1.04] shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" : "scale-100"}`}>
                  {stageDefinitions.find((s) => s.key === currentStage)?.title ?? customer.status}
                </span>
                <Link
                  href={`/customers/${customer.id}/edit`}
                  className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.97]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => openActionModal("CLOSE_PROJECT")}
                  disabled={!canUpdatePayment}
                  className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-violet-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Update Payment
                </button>
              </div>
            </div>

            {/* Row 2: Summary strip */}
            <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3 sm:gap-0">
              <div className="sm:pr-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">System Capacity</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{systemCapacity}</p>
              </div>
              <div className="sm:border-l sm:border-slate-100 sm:px-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">Current Stage</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {stageDefinitions.find((s) => s.key === currentStage)?.title ?? customer.status}
                </p>
              </div>
              <div className="sm:border-l sm:border-slate-100 sm:px-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">Created</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateTimeUTC(customer.created_at)}</p>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════
               WORKFLOW PROGRESS
          ══════════════════════════════════════════ */}
          <div className="rounded-lg bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">Workflow Progress</p>

            {/* Horizontal stepper */}
            <div className="mt-5 flex items-start">
              {stageDefinitions.map((stage, index) => {
                const isDone = index < progressIndex
                const isActive = index === progressIndex
                const isLast = index === stageDefinitions.length - 1
                return (
                  <div key={stage.key} className="flex flex-1 flex-col items-center">
                    <div className="flex w-full items-center">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                          isDone
                            ? "bg-emerald-500 text-white"
                            : isActive
                            ? "bg-blue-600 text-white ring-4 ring-blue-100"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {isDone ? <Check className="h-3.5 w-3.5" /> : isActive ? <Zap className="h-3.5 w-3.5" /> : "○"}
                      </div>
                      {!isLast ? (
                        <div className={`h-0.5 flex-1 transition-colors ${index < progressIndex ? "bg-emerald-400" : "bg-slate-100"}`} />
                      ) : null}
                    </div>
                    <p
                      className={`mt-2 text-center text-[11px] font-medium leading-tight ${
                        isActive ? "text-slate-900" : isDone ? "text-emerald-600" : "text-slate-400"
                      }`}
                    >
                      {stage.title}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Next action required — dominant CTA */}
            {currentWorkflowStage !== "CLOSED" ? (
              <div className="mt-5 overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-violet-50/40">
                <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600/10">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-blue-600">Next Action Required</p>
                    <p className="mt-0.5 text-[15px] font-semibold leading-snug text-slate-900">{allowedActionModel.guidance}</p>
                  </div>
                  {nextActionInfo && nextActionInfo.key !== "CLOSE_PROJECT" ? (
                    <button
                      type="button"
                      onClick={() => openActionModal(nextActionInfo.key)}
                      className="inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.97]"
                    >
                      {nextActionInfo.label}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/60 px-5 py-4">
                <Check className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-800">All stages complete — project is closed.</p>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════
               ACTION BAR
          ══════════════════════════════════════════ */}
          <div className="flex justify-end gap-3">
            {allowedActionModel.allowedActions
              .filter((action) => action !== "CLOSE_PROJECT")
              .map((action) => {
                const meta = actionMeta(action)
                return (
                  <button
                    key={action}
                    type="button"
                    onClick={() => openActionModal(action)}
                    className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.97]"
                  >
                    {action === "START_INSTALLATION" ? <Plus className="h-4 w-4 text-slate-400" /> : null}
                    {action === "SUBMIT_APPROVAL_DOCUMENTS" ? <Upload className="h-4 w-4 text-slate-400" /> : null}
                    {meta.label}
                  </button>
                )
              })}
          </div>

          {/* ══════════════════════════════════════════
               MAIN 2-COLUMN LAYOUT
          ══════════════════════════════════════════ */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
            {/* ── LEFT: Stage Pipeline + Documents ── */}
            <div className="space-y-5">

              {/* Stage Pipeline */}
              <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <div className="border-b border-slate-100 px-5 py-3.5">
                  <h2 className="text-sm font-semibold text-slate-900">Stage Pipeline</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {orderedStages.map((stage) => {
                    const badge = stageBadge(stage.key, customer.status)
                    const isCurrent = stage.key === currentStage
                    const isExpanded = expandedStageKey === stage.key
                    const dynamicActions =
                      stage.key === currentStage
                        ? stage.actions.filter((action) => allowedActionModel.allowedActions.includes(action.key))
                        : []
                    return (
                      <WorkflowStageCard
                        key={stage.key}
                        stage={{ ...stage, actions: dynamicActions }}
                        current={isCurrent}
                        expanded={isExpanded}
                        statusLabel={badge.label}
                        statusTone={badge.tone}
                        onActionClick={(action) => openActionModal(action.key)}
                        onToggle={() => setExpandedStageKey(isExpanded ? null : stage.key)}
                        loadingActionKey={actionLoading}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Documents */}
              <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <h2 className="text-sm font-semibold text-slate-900">Documents</h2>
                  {allowedActionModel.allowedActions.includes("SUBMIT_APPROVAL_DOCUMENTS") ? (
                    <button
                      type="button"
                      onClick={() => openActionModal("SUBMIT_APPROVAL_DOCUMENTS")}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.97]"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload Document
                    </button>
                  ) : null}
                </div>
                <div className="hidden md:block">
                  <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-white text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                      <th className="px-5 py-3">File name</th>
                      <th className="px-5 py-3">Size</th>
                      <th className="px-5 py-3">Uploaded</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">
                          No documents uploaded yet.
                        </td>
                      </tr>
                    ) : (
                      documents.map((doc) => (
                        <tr key={doc.id} className="border-b border-slate-100 text-[14px] text-slate-900 transition-colors hover:bg-slate-50">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <FileText className="h-4 w-4 shrink-0 text-slate-300" />
                              <span className="font-medium text-slate-800">{doc.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500">{formatBytes(doc.file_size)}</td>
                          <td className="px-5 py-3.5 text-slate-500">{formatDateTimeUTC(doc.created_at)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              disabled={viewingDocumentId === doc.id}
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
                              className="inline-flex h-7 items-center gap-1 rounded border border-slate-200 px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                            >
                              {viewingDocumentId === doc.id ? "Opening…" : "View"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  </table>
                </div>
                <div className="divide-y divide-slate-100 md:hidden">
                  {documents.length === 0 ? (
                    <div className="px-5 py-10 text-center text-sm text-slate-400">No documents uploaded yet.</div>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className="space-y-3 px-5 py-4">
                        <div className="flex items-start gap-2.5">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800">{doc.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{formatBytes(doc.file_size)} • {formatDateTimeUTC(doc.created_at)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={viewingDocumentId === doc.id}
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
                          className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                        >
                          {viewingDocumentId === doc.id ? "Opening…" : "View document"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ── RIGHT: Tasks + Activity ── */}
            <div className="space-y-5">

              <div className={`overflow-hidden rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] ${persistedRemainingAmount > 0 ? "border border-amber-200 bg-amber-50/40" : "bg-white"}`}>
                <div className="border-b border-slate-100 px-4 py-3.5">
                  <h2 className="text-sm font-semibold text-slate-900">Payment Overview</h2>
                </div>
                <div className="space-y-3 px-4 py-3.5">
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">Total</p>
                      <p className="mt-1 font-semibold text-slate-900">{persistedTotalAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">Paid</p>
                      <p className="mt-1 font-semibold text-slate-900">{persistedPaidAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">Remaining</p>
                      <p className="mt-1 font-semibold text-slate-900">{persistedRemainingAmount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-600" style={{ width: `${paymentProgressPct}%` }} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500">{paymentProgressPct.toFixed(0)}% paid</span>
                      <span className={`font-semibold ${persistedPaymentStatus.toLowerCase() === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                        {persistedPaymentStatus}
                      </span>
                    </div>
                  </div>
                  {persistedRemainingAmount > 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Payment pending: closure is blocked until the full amount is paid.
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Tasks */}
              <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                  <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
                  {allowedActionModel.allowedActions.includes("START_INSTALLATION") ? (
                    <button
                      type="button"
                      onClick={() => openActionModal("START_INSTALLATION")}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.97]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Task
                    </button>
                  ) : null}
                </div>
                {tasks.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm font-medium text-slate-500">No tasks yet</p>
                    <p className="mt-1 text-xs text-slate-400">Create tasks to track customer progress</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {tasks.map((task) => (
                      <div key={task.id} className="cursor-default px-4 py-3.5 transition-colors hover:bg-slate-50">
                        <p className="text-sm font-medium text-slate-900">{task.title}</p>
                        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-[12px] text-slate-400">
                            {task.due_date ? formatDateTimeUTC(task.due_date) : "No due date"}
                          </span>
                          <span
                            className={`inline-flex rounded-[6px] px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                              (task.priority ?? "").toLowerCase() === "high"
                                ? "bg-rose-50 text-rose-600 ring-rose-200"
                                : (task.priority ?? "").toLowerCase() === "medium"
                                ? "bg-amber-50 text-amber-600 ring-amber-200"
                                : "bg-slate-50 text-slate-500 ring-slate-200"
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity Timeline */}
              <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <div className="border-b border-slate-100 px-4 py-3.5">
                  <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
                </div>
                {activities.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">No activity yet</div>
                ) : (
                  <div className="px-4 py-3">
                    {activities.map((activity, index) => (
                      <div key={activity.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                          {index < activities.length - 1 ? (
                            <div className="mt-1 w-px flex-1 bg-slate-100" />
                          ) : null}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm text-slate-800">{activity.action}</p>
                          {activity.details && typeof activity.details === "object" ? (
                            <div className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                              {"actor" in (activity.details as Record<string, unknown>) ? (
                                <p>By: {String((activity.details as Record<string, unknown>).actor)}</p>
                              ) : null}
                              {"timestamp" in (activity.details as Record<string, unknown>) ? (
                                <p>At: {formatDateTimeUTC(String((activity.details as Record<string, unknown>).timestamp))}</p>
                              ) : null}
                              {"previous_state" in (activity.details as Record<string, unknown>) &&
                              "new_state" in (activity.details as Record<string, unknown>) ? (
                                <p>
                                  {String(((activity.details as Record<string, unknown>).previous_state as Record<string, unknown>)?.stage ?? "-")} {"->"}{" "}
                                  {String(((activity.details as Record<string, unknown>).new_state as Record<string, unknown>)?.stage ?? "-")}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                          <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTimeUTC(activity.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <WorkflowActionModal
        open={modalState.action === "SUBMIT_APPROVAL_DOCUMENTS"}
        title="Submit Government Documents"
        subtitle="Upload the submission package and add a reference to move this customer into approval review."
        customerName={customer?.name ?? "Customer"}
        stageLabel={modalStageLabel("SUBMIT_APPROVAL_DOCUMENTS")}
        submitLabel="Submit for Approval"
        loading={actionLoading === "SUBMIT_APPROVAL_DOCUMENTS"}
        loadingMessage={actionProgressMessage}
        submitDisabled={!submissionDoc || !submissionRefNumber.trim() || !submissionReferenceValid}
        errorMessage={modalError}
        showRetry={modalRetryable}
        onClose={closeModal}
        onSubmit={() => void runAction()}
        onRetry={() => void runAction()}
      >
        <div className="space-y-4">
          <FileDropInput
            label="Upload Document"
            helperText="PDF, JPG, PNG, DOC up to 10 MB"
            file={submissionDoc}
            onFileChange={setSubmissionDoc}
            error={modalAttempted && !submissionDoc ? "Upload a submission document to continue." : undefined}
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Reference number</label>
            <input
              value={submissionRefNumber}
              onChange={(event) => setSubmissionRefNumber(event.target.value)}
              className={`${textFieldClass} ${
                modalAttempted && (!submissionRefNumber.trim() || !submissionReferenceValid)
                  ? "field-shake border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100"
                  : ""
              }`}
              placeholder="e.g. TN-EB/2026-1001"
            />
            <p className="text-xs text-slate-500">Format: 4-40 characters. Allowed: letters, numbers, / and -</p>
            {modalAttempted && !submissionRefNumber.trim() ? <p className="text-xs text-rose-600">Reference number is required.</p> : null}
            {modalAttempted && submissionRefNumber.trim() && !submissionReferenceValid ? (
              <p className="text-xs text-rose-600">Use only letters, numbers, / and - (4-40 characters).</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={submissionNotes}
              onChange={(event) => setSubmissionNotes(event.target.value)}
              rows={3}
              className={areaFieldClass}
              placeholder="Add optional notes for the approval team"
            />
          </div>
        </div>
      </WorkflowActionModal>

      <WorkflowActionModal
        open={modalState.action === "MARK_GOVERNMENT_APPROVED"}
        title="Approve Government Submission"
        subtitle="Confirm approval details and move the customer into the installation stage."
        customerName={customer?.name ?? "Customer"}
        stageLabel={modalStageLabel("MARK_GOVERNMENT_APPROVED")}
        submitLabel="Approve & Continue"
        loading={actionLoading === "MARK_GOVERNMENT_APPROVED"}
        loadingMessage={actionProgressMessage}
        submitDisabled={!approvalDoc || !approvalNumber.trim() || !approvalDate.trim() || !approvalNumberValid || !approvalDateValid}
        errorMessage={modalError}
        showRetry={modalRetryable}
        onClose={closeModal}
        onSubmit={() => void runAction()}
        onRetry={() => void runAction()}
      >
        <div className="space-y-4">
          <FileDropInput
            label="Upload Document"
            helperText="Attach the final approved document"
            file={approvalDoc}
            onFileChange={setApprovalDoc}
            error={modalAttempted && !approvalDoc ? "Approval document is required." : undefined}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Approval number</label>
              <input
                value={approvalNumber}
                onChange={(event) => setApprovalNumber(event.target.value)}
                className={`${textFieldClass} ${
                  modalAttempted && (!approvalNumber.trim() || !approvalNumberValid)
                    ? "field-shake border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100"
                    : ""
                }`}
                placeholder="e.g. GOV/APP-45821"
              />
              <p className="text-xs text-slate-500">Format: 4-40 characters. Allowed: letters, numbers, / and -</p>
              {modalAttempted && !approvalNumber.trim() ? <p className="text-xs text-rose-600">Approval number is required.</p> : null}
              {modalAttempted && approvalNumber.trim() && !approvalNumberValid ? (
                <p className="text-xs text-rose-600">Use only letters, numbers, / and - (4-40 characters).</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Approval date</label>
              <input
                type="date"
                value={approvalDate}
                onChange={(event) => setApprovalDate(event.target.value)}
                className={`${textFieldClass} ${
                  modalAttempted && (!approvalDate.trim() || !approvalDateValid)
                    ? "field-shake border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100"
                    : ""
                }`}
              />
              <p className="text-xs text-slate-500">Use calendar date format YYYY-MM-DD.</p>
              {modalAttempted && !approvalDate.trim() ? <p className="text-xs text-rose-600">Approval date is required.</p> : null}
              {modalAttempted && approvalDate.trim() && !approvalDateValid ? <p className="text-xs text-rose-600">Enter valid date</p> : null}
            </div>
          </div>
        </div>
      </WorkflowActionModal>

      <WorkflowActionModal
        open={modalState.action === "START_INSTALLATION"}
        title="Start Installation"
        subtitle="Create the installation task and assign ownership to begin execution."
        customerName={customer?.name ?? "Customer"}
        stageLabel={modalStageLabel("START_INSTALLATION")}
        submitLabel="Start Installation"
        loading={actionLoading === "START_INSTALLATION"}
        loadingMessage={actionProgressMessage}
        submitDisabled={!startDate.trim() || !estimatedDays.trim() || !assignedTeam.trim()}
        errorMessage={modalError}
        showRetry={modalRetryable}
        onClose={closeModal}
        onSubmit={() => void runAction()}
        onRetry={() => void runAction()}
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={`${textFieldClass} ${
                  modalAttempted && !startDate.trim() ? "field-shake border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100" : ""
                }`}
              />
              {modalAttempted && !startDate.trim() ? <p className="text-xs text-rose-600">Start date is required.</p> : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Estimated completion days</label>
              <input
                type="number"
                min={1}
                value={estimatedDays}
                onChange={(event) => setEstimatedDays(event.target.value)}
                className={`${textFieldClass} ${
                  modalAttempted && !estimatedDays.trim()
                    ? "field-shake border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100"
                    : ""
                }`}
                placeholder="e.g. 7"
              />
              {modalAttempted && !estimatedDays.trim() ? <p className="text-xs text-rose-600">Estimated days is required.</p> : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Assigned team member</label>
            <select
              value={assignedTeam}
              onChange={(event) => setAssignedTeam(event.target.value)}
              className={`${textFieldClass} ${
                modalAttempted && !assignedTeam.trim() ? "field-shake border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100" : ""
              }`}
            >
              <option value="">Select team member</option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name || assignee.email || assignee.id}
                </option>
              ))}
            </select>
            {modalAttempted && !assignedTeam.trim() ? <p className="text-xs text-rose-600">Assign a team member to continue.</p> : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={installationNotes}
              onChange={(event) => setInstallationNotes(event.target.value)}
              rows={3}
              className={areaFieldClass}
              placeholder="Optional instructions for the installation team"
            />
          </div>
        </div>
      </WorkflowActionModal>

      <WorkflowActionModal
        open={modalState.action === "MARK_INSTALLATION_COMPLETED"}
        title="Complete Installation"
        subtitle="Confirm completion and move this project into closure and payment finalization."
        customerName={customer?.name ?? "Customer"}
        stageLabel={modalStageLabel("MARK_INSTALLATION_COMPLETED")}
        submitLabel="Update Status"
        loading={actionLoading === "MARK_INSTALLATION_COMPLETED"}
        loadingMessage={actionProgressMessage}
        submitDisabled={!installationPaymentValid}
        errorMessage={modalError}
        showRetry={modalRetryable}
        onClose={closeModal}
        onSubmit={() => void runAction()}
        onRetry={() => void runAction()}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 text-sm text-emerald-800">
            <CircleCheck size={16} className="text-emerald-600" /> Complete installation for this customer.
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Completion notes</label>
            <textarea
              value={installCompleteNotes}
              onChange={(event) => setInstallCompleteNotes(event.target.value)}
              rows={3}
              className={areaFieldClass}
              placeholder="Add final completion details"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Total Amount</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={installationTotalAmount}
                onChange={(event) => setInstallationTotalAmount(event.target.value)}
                className={`${textFieldClass} ${
                  modalAttempted && installationTotalAmountValue <= 0
                    ? "field-shake border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100"
                    : ""
                }`}
                placeholder="0.00"
              />
              {modalAttempted && installationTotalAmountValue <= 0 ? <p className="text-xs text-rose-600">Enter total amount</p> : null}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Paid Amount</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={installationPaidAmount}
                onChange={(event) => setInstallationPaidAmount(event.target.value)}
                className={`${textFieldClass} ${
                  modalAttempted && !installationPaymentValid
                    ? "field-shake border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100"
                    : ""
                }`}
                placeholder="0.00"
              />
              {modalAttempted && !installationPaymentValid ? <p className="text-xs text-rose-600">Paid amount cannot exceed total amount</p> : null}
            </div>
          </div>
        </div>
      </WorkflowActionModal>

      <WorkflowActionModal
        open={modalState.action === "CLOSE_PROJECT"}
        title="Update Payment Status"
        subtitle="Record payment details and close the customer workflow when everything is complete."
        customerName={customer?.name ?? "Customer"}
        stageLabel={modalStageLabel("CLOSE_PROJECT")}
        submitLabel="Update Payment"
        loading={actionLoading === "CLOSE_PROJECT"}
        loadingMessage={actionProgressMessage}
        submitDisabled={!completionNotes.trim() || totalAmountValue <= 0 || !paymentAmountValid}
        errorMessage={modalError}
        showRetry={modalRetryable}
        onClose={closeModal}
        onSubmit={() => void runAction()}
        onRetry={() => void runAction()}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Total Amount</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={totalAmount}
              onChange={(event) => setTotalAmount(event.target.value)}
              className={`${textFieldClass} ${
                modalAttempted && totalAmountValue <= 0 ? "field-shake border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100" : ""
              }`}
              placeholder="0.00"
            />
            {modalAttempted && totalAmountValue <= 0 ? <p className="text-xs text-rose-600">Total amount is required to continue.</p> : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Paid Amount</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={paidAmount}
              onChange={(event) => setPaidAmount(event.target.value)}
              className={`${textFieldClass} ${
                modalAttempted && !paymentAmountValid
                  ? "field-shake border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100"
                  : ""
              }`}
              placeholder="0.00"
            />
            {modalAttempted && !paymentAmountValid ? <p className="text-xs text-rose-600">Paid amount cannot be greater than total amount.</p> : null}
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">Remaining</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{remainingAmountValue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">Status</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{autoPaymentStatus}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">Paid</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{paidAmountValue.toFixed(2)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-sm text-blue-800">
            Original total: Rs {persistedTotalAmount.toFixed(2)}. Remaining balance: Rs {Math.max(persistedTotalAmount - paidAmountValue, 0).toFixed(2)}.
          </div>

          <FileDropInput
            label="Upload Document"
            helperText="Attach invoice or closure evidence (optional)"
            file={invoiceDoc}
            onFileChange={setInvoiceDoc}
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Completion notes</label>
            <textarea
              value={completionNotes}
              onChange={(event) => setCompletionNotes(event.target.value)}
              rows={3}
              className={`${areaFieldClass} ${
                modalAttempted && !completionNotes.trim() ? "field-shake border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100" : ""
              }`}
              placeholder="Summarize closure and payment details"
            />
            {modalAttempted && !completionNotes.trim() ? <p className="text-xs text-rose-600">Completion notes are required.</p> : null}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-sm text-blue-800">
            <Clock3 size={16} className="text-blue-600" /> Project will be marked as closed only after full payment is recorded.
          </div>
        </div>
      </WorkflowActionModal>
    </div>
  )
}
