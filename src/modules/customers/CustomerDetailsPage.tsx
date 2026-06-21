"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Check, CircleCheck, CreditCard, FileText, Flag, Loader2, Lock, Pencil, Plus, Upload, UserRound, X, Zap } from "lucide-react"
import { formatDateTimeUTC } from "@/utils/dateFormat"
import { validateUUID } from "@/utils/validateUUID"
import { getCustomerById, getCustomerProgress, updateCustomer } from "@/services/customerService"
import { getTasksByCustomerId, createTask, getAssignableTaskUsers } from "@/services/taskService"
import { listDocumentsByCustomerId, downloadDocument, uploadDocument } from "@/services/documentService"
import { getCustomerActivityLogs } from "@/services/activityLogService"
import { getSystemAvailability } from "@/services/inventoryService"
import { consumeReservedInventoryForInstallation } from "@/services/installationInventoryService"
import { getPaymentsByInstallationId, createPaymentForInstallation, uploadPaymentProof } from "@/services/paymentService"
import WorkflowStageCard from "./workflow/WorkflowStageCard"
import { iconForStage } from "./workflow/stageIcons"
import FileDropInput from "./workflow/FileDropInput"
import WorkflowActionModal from "./workflow/WorkflowActionModal"
import PaymentHistoryModal from "./workflow/PaymentHistoryModal"
import PaymentSummaryCards from "./workflow/PaymentSummaryCards"
import Modal from "@/components/ui/Modal"
import Button from "@/components/ui/Button"
import Card from "@/components/ui/Card"
import {
  buildPaymentRecordNotes,
  computeFinalBillable,
  isInstallationCompleteStatus,
  parseDiscountFromNotes,
} from "./workflow/paymentHelpers"
import type { StageDefinition, WorkflowActionKey, WorkflowBadgeTone, WorkflowStageKey } from "./workflow/types"

type CustomerRow = {
  id: string
  organization_id: string
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
  total_cost?: number | null
  paid_amount?: number | null
  pending_amount?: number | null
  payment_status?: string | null
  notes: string | null
  created_at: string
}

type PaymentRow = {
  id: string
  organization_id: string
  installation_id: string
  amount: number
  payment_date: string
  payment_method: string
  notes: string | null
  proof_url: string | null
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

type StepVisualState = "completed" | "active" | "upcoming" | "blocked"

type StageStatusEntry = {
  label: string
  tone: WorkflowBadgeTone
}

type StageStatusMap = Record<WorkflowStageKey, StageStatusEntry>

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
  if (value.includes("INSTALLATION")) return "INSTALLATION"
  if (value.includes("APPROVED")) return "GOVERNMENT_APPROVAL"
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

function shortStageLabel(stageKey: WorkflowStageKey) {
  if (stageKey === "GOVERNMENT_APPROVAL") return "Govt Approval"
  if (stageKey === "INSTALLATION") return "Install"
  if (stageKey === "CLOSURE") return "Closure"
  return "Created"
}

function stepNodeClass(visualState: StepVisualState) {
  if (visualState === "completed") return "workflow-step-node-completed"
  if (visualState === "active") return "workflow-step-node-active"
  if (visualState === "blocked") return "workflow-step-node-blocked"
  return "workflow-step-node-upcoming"
}

function stepLabelClass(visualState: StepVisualState) {
  if (visualState === "completed") return "completed"
  if (visualState === "active") return "current"
  if (visualState === "blocked") return "blocked"
  return "pending"
}

function renderStepIndicator(visualState: StepVisualState, Icon: typeof UserRound) {
  if (visualState === "completed") return <CircleCheck className="h-4 w-4" strokeWidth={2} />
  if (visualState === "blocked") return <Lock className="h-4 w-4" strokeWidth={1.75} />
  return <Icon className="h-4 w-4" strokeWidth={1.75} />
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value)
}

function formatCompactCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`
  return `₹${value.toLocaleString("en-IN")}`
}

function derivePersistedPaymentSnapshot(customer: CustomerRow | null): PaymentModel {
  const total = customer?.total_cost ?? parseAmountFromNotes(customer?.notes, "Total Amount")
  const paid = customer?.paid_amount ?? parseAmountFromNotes(customer?.notes, "Paid Amount")
  const remaining = Math.max(total - paid, 0)
  const status = customer?.payment_status ?? parsePaymentStatusFromNotes(customer?.notes)
  return {
    total,
    paid,
    remaining,
    status: status === "Paid" ? "Paid" : status === "Partial" ? "Partial" : "Pending"
  }
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

function buildStageStatusMap({
  status,
  payment,
  stageHistory,
  currentWorkflowStage,
}: {
  status: string
  payment: PaymentModel
  stageHistory: Array<{ current_stage: string; created_at: string }>
  currentWorkflowStage: WorkflowStageValue
}): StageStatusMap {
  const normalizedStatus = normalizeWorkflowStatus(status)
  const normalizedStageHistory = new Set(
    stageHistory.map((entry) => normalizeWorkflowStage(entry.current_stage))
  )
  const normalizedStatusText = status.toLowerCase()

  const stageOrder: Record<WorkflowStageValue, number> = {
    CREATED: 0,
    SUBMITTED: 1,
    APPROVED: 2,
    INSTALLATION: 3,
    CLOSED: 4
  }
  const currentStageIndex = stageOrder[currentWorkflowStage] ?? 0

  const submissionCompleted =
    currentStageIndex >= stageOrder.SUBMITTED ||
    normalizedStageHistory.has("SUBMITTED") ||
    normalizedStatusText.includes("submitted") ||
    normalizedStatusText.includes("approval submitted")

  const approvalCompleted =
    currentStageIndex >= stageOrder.APPROVED ||
    normalizedStageHistory.has("APPROVED") ||
    normalizedStatusText.includes("government approved")

  const approvalSubmitted =
    approvalCompleted ||
    currentStageIndex >= stageOrder.SUBMITTED ||
    normalizedStageHistory.has("SUBMITTED") ||
    normalizedStatus === "APPROVAL_SUBMITTED"

  const installationCompleted =
    currentStageIndex >= stageOrder.INSTALLATION ||
    normalizedStatus === "COMPLETED" ||
    normalizedStatus === "COMPLETED_PAYMENT_PENDING"
  const installationInProgress =
    normalizedStatus === "IN_PROGRESS" || currentStageIndex >= stageOrder.INSTALLATION

  const closureCompleted = currentStageIndex >= stageOrder.CLOSED
  const closurePaymentPending = !closureCompleted && payment.total > 0 && payment.remaining > 0

  return {
    CREATED: { label: "Completed", tone: "completed" },
    GOVERNMENT_APPROVAL: approvalCompleted
      ? { label: "Completed", tone: "completed" }
      : approvalSubmitted
      ? { label: "Submitted", tone: "inProgress" }
      : { label: "Pending", tone: "pending" },
    INSTALLATION: installationCompleted
      ? normalizedStatus === "COMPLETED_PAYMENT_PENDING" && payment.remaining > 0
        ? { label: "Payment Pending", tone: "pending" }
        : { label: "Completed", tone: "completed" }
      : installationInProgress
      ? normalizedStatus === "IN_PROGRESS"
        ? { label: "In Progress", tone: "inProgress" }
        : { label: "Pending", tone: "pending" }
      : { label: "Pending", tone: "pending" },
    CLOSURE: closureCompleted
      ? { label: "Closed", tone: "completed" }
      : closurePaymentPending
      ? { label: "Payment Pending", tone: "pending" }
      : installationCompleted && payment.remaining <= 0
      ? { label: "Closure Ready", tone: "inProgress" }
      : { label: "Pending", tone: "pending" },
  }
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
    label: "Close Project",
    description: "Payment is complete. Close and archive this installation."
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
        allowedActions: closureEnabled ? ["CLOSE_PROJECT"] : [],
        primaryAction: closureEnabled ? "CLOSE_PROJECT" : null,
        guidance: closureEnabled
          ? "Payment complete. Close the project to finalize."
          : `Rs ${payment.remaining.toFixed(2)} remaining. Record payment from the sidebar to continue.`,
        closureEnabled
      }
    }

    if (normalizedStatus === "COMPLETED") {
      return {
        allowedActions: closureEnabled ? ["CLOSE_PROJECT"] : [],
        primaryAction: closureEnabled ? "CLOSE_PROJECT" : null,
        guidance: closureEnabled
          ? "Payment complete. Close the project to finalize."
          : `Rs ${payment.remaining.toFixed(2)} remaining. Record payment from the sidebar to continue.`,
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
  const [payments, setPayments] = useState<PaymentRow[]>([])
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
  const [contractValue, setContractValue] = useState("")
  const [discountAmount, setDiscountAmount] = useState("")
  const [discountReason, setDiscountReason] = useState("")
  const [recordPaymentOnComplete, setRecordPaymentOnComplete] = useState(false)
  const [inlineInstallPaymentAmount, setInlineInstallPaymentAmount] = useState("")
  const [inlineInstallPaymentDate, setInlineInstallPaymentDate] = useState("")
  const [inlineInstallPaymentMethod, setInlineInstallPaymentMethod] = useState("")
  const [inlineInstallPaymentReference, setInlineInstallPaymentReference] = useState("")
  const [inlineInstallPaymentCollectedBy, setInlineInstallPaymentCollectedBy] = useState("")

  const [installCompleteNotes, setInstallCompleteNotes] = useState("")

  const [invoiceDoc, setInvoiceDoc] = useState<File | null>(null)
  const [completionNotes, setCompletionNotes] = useState("")

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null)
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentCollectedBy, setPaymentCollectedBy] = useState("")
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState("")

  const loadDetail = useCallback(async () => {
    if (!customerId || !validateUUID(customerId)) {
      router.replace("/customers")
      return
    }

    setLoading(true)
    setError("")

    try {
      const [{ data: customerData }, taskResult, docResult, activityResult, progressResult, systemsResult, assigneeResult, paymentResult] = await Promise.all([
        getCustomerById(customerId),
        getTasksByCustomerId(customerId, 100),
        listDocumentsByCustomerId(customerId, 100),
        getCustomerActivityLogs(customerId, 100),
        getCustomerProgress(customerId, 100),
        getSystemAvailability(),
        getAssignableTaskUsers(),
        getPaymentsByInstallationId(customerId)
      ])

      if (!customerData) {
        setCustomer(null)
        setError("Customer not found")
        return
      }

      setCustomer(customerData as unknown as CustomerRow)
      setTasks((taskResult.data ?? []) as TaskRow[])
      setDocuments((docResult.data ?? []) as DocumentRow[])
      setActivities((activityResult.data ?? []) as ActivityRow[])
      setProgress((progressResult ?? null) as ProgressRow | null)
      setSystems((systemsResult.data ?? []) as SystemAvailabilityRow[])
      setAssignees((assigneeResult.data ?? []) as AssigneeRow[])
      setPayments((paymentResult.data ?? []) as PaymentRow[])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Operation failed")
      setTasks([])
      setDocuments([])
      setActivities([])
      setPayments([])
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

  const currentStageIndex = useMemo(() => stageDefinitions.findIndex((stage) => stage.key === currentStage), [currentStage])
  const stageProgressPercent = useMemo(() => {
    if (stageDefinitions.length <= 1) return 0
    const cappedIndex = Math.min(Math.max(currentStageIndex, 0), stageDefinitions.length - 1)
    return (cappedIndex / (stageDefinitions.length - 1)) * 100
  }, [currentStageIndex])

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

  function businessStageLabel() {
    if (currentWorkflowStage === "CLOSED") return "Closed"
    if (currentWorkflowStage === "INSTALLATION") {
      const normalizedStatus = normalizeWorkflowStatus(customer?.status ?? "")
      if ((normalizedStatus === "COMPLETED" || normalizedStatus === "COMPLETED_PAYMENT_PENDING") && persistedRemainingAmount > 0) {
        return "Installation Completed • Payment Pending"
      }
      if (normalizedStatus === "IN_PROGRESS") return "Installation In Progress"
      if (normalizedStatus === "COMPLETED" && persistedRemainingAmount <= 0) return "Closure Ready"
      return "Installation"
    }
    if (currentWorkflowStage === "APPROVED") return "Government Approved"
    if (currentWorkflowStage === "SUBMITTED") return "Government Approval"
    return "Customer Created"
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
    setContractValue("")
    setDiscountAmount("")
    setDiscountReason("")
    setRecordPaymentOnComplete(false)
    setInlineInstallPaymentAmount("")
    setInlineInstallPaymentDate("")
    setInlineInstallPaymentMethod("")
    setInlineInstallPaymentReference("")
    setInlineInstallPaymentCollectedBy("")
    setInstallCompleteNotes("")
    setCompletionNotes("")
  }

  const openActionModal = (action: WorkflowActionKey) => {
    setModalError("")
    setModalRetryable(false)
    setModalAttempted(false)

    if (action === "MARK_INSTALLATION_COMPLETED") {
      const snapshot = derivePersistedPaymentSnapshot(customer)
      const discountMeta = parseDiscountFromNotes(customer?.notes)
      const baseContract = discountMeta.contractValue > 0 ? discountMeta.contractValue : snapshot.total
      setContractValue(baseContract > 0 ? baseContract.toFixed(2) : "")
      setDiscountAmount(discountMeta.discount > 0 ? discountMeta.discount.toFixed(2) : "0")
      setDiscountReason(discountMeta.reason)
      setRecordPaymentOnComplete(false)
      setInlineInstallPaymentAmount("")
      setInlineInstallPaymentDate(new Date().toISOString().slice(0, 10))
      setInlineInstallPaymentMethod("")
      setInlineInstallPaymentReference("")
      setInlineInstallPaymentCollectedBy("")
      setInstallationTotalAmount(snapshot.total > 0 ? snapshot.total.toFixed(2) : "")
    }

    setModalState({ action })
  }

  const openPaymentModal = () => {
    setPaymentError("")
    const snapshot = derivePersistedPaymentSnapshot(customer)
    setPaymentAmount(snapshot.remaining > 0 ? snapshot.remaining.toFixed(2) : "")
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setPaymentMethod("")
    setPaymentNotes("")
    setPaymentReference("")
    setPaymentCollectedBy("")
    setPaymentProofFile(null)
    setPaymentModalOpen(true)
  }

  const closePaymentModal = () => {
    if (paymentSubmitting) return
    setPaymentModalOpen(false)
    setPaymentError("")
  }

  const submitPayment = async () => {
    if (!customer) return
    const amountValue = Number(paymentAmount || 0)
    const snapshot = derivePersistedPaymentSnapshot(customer)

    if (amountValue <= 0) {
      setPaymentError("Enter a valid payment amount.")
      return
    }
    if (amountValue > snapshot.remaining) {
      setPaymentError("Amount exceeds remaining balance.")
      return
    }
    if (!paymentDate) {
      setPaymentError("Select a payment date.")
      return
    }

    setPaymentError("")
    setPaymentSubmitting(true)

    try {
      let proofUrl: string | null = null
      if (paymentProofFile) {
        proofUrl = await uploadPaymentProof(paymentProofFile, customer.id)
      }

      await createPaymentForInstallation({
        installation_id: customer.id,
        organization_id: customer.organization_id,
        amount: amountValue,
        payment_date: paymentDate,
        payment_method: paymentMethod || "Unknown",
        notes: buildPaymentRecordNotes(paymentNotes, paymentReference, paymentCollectedBy),
        proof_url: proofUrl,
      })

      await loadDetail()

      const refreshed = await getCustomerById(customer.id)
      const refreshedCustomer = refreshed.data as CustomerRow | null
      if (refreshedCustomer) {
        setCustomer(refreshedCustomer)
        const refreshedSnapshot = derivePersistedPaymentSnapshot(refreshedCustomer)
        const installComplete = isInstallationCompleteStatus(refreshedCustomer.status)

        if (installComplete && refreshedSnapshot.remaining <= 0 && refreshedSnapshot.total > 0) {
          await updateCustomer(refreshedCustomer.id, {
            status: "Completed",
            current_stage: refreshedCustomer.current_stage ?? "INSTALLATION",
            notes: appendNotes(refreshedCustomer.notes, "Payment Cleared", [
              `Payment Status: Paid`,
              `Total Amount: ${refreshedSnapshot.total.toFixed(2)}`,
              `Paid Amount: ${refreshedSnapshot.paid.toFixed(2)}`,
              `Remaining Amount: 0.00`,
              "Project is ready for closure.",
            ]),
          })
          await loadDetail()
          setStatusToast("Balance cleared — project is ready for closure")
        } else {
          setStatusToast("Payment recorded successfully")
        }
      } else {
        setStatusToast("Payment recorded successfully")
      }

      closePaymentModal()
    } catch (paymentSubmitError) {
      setPaymentError(paymentSubmitError instanceof Error ? paymentSubmitError.message : "Unable to create payment.")
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const textFieldClass = "input h-12"
  const areaFieldClass = "textarea"

  function modalStageLabel(action: WorkflowActionKey | null) {
    if (action === "SUBMIT_APPROVAL_DOCUMENTS" || action === "MARK_GOVERNMENT_APPROVED") return "Government Approval"
    if (action === "START_INSTALLATION" || action === "MARK_INSTALLATION_COMPLETED") return "Installation"
    if (action === "CLOSE_PROJECT") return "Closure"
    return stageDefinitions.find((stage) => stage.key === currentStage)?.title ?? "Workflow"
  }

  const approvalDateValid = !approvalDate.trim() || !Number.isNaN(new Date(approvalDate).getTime())
  const approvalNumberPattern = /^[A-Za-z0-9/-]{4,40}$/
  const approvalNumberValid = !approvalNumber.trim() || approvalNumberPattern.test(approvalNumber.trim())
  const submissionReferencePattern = /^[A-Za-z0-9/-]{4,40}$/
  const submissionReferenceValid = !submissionRefNumber.trim() || submissionReferencePattern.test(submissionRefNumber.trim())

  const persistedPaymentSnapshot = derivePersistedPaymentSnapshot(customer)
  const persistedTotalAmount = persistedPaymentSnapshot.total
  const persistedPaidAmount = persistedPaymentSnapshot.paid
  const persistedRemainingAmount = persistedPaymentSnapshot.remaining
  const persistedPaymentStatus = persistedPaymentSnapshot.status
  const paymentProgressPct = persistedTotalAmount > 0 ? Math.min(100, (persistedPaidAmount / persistedTotalAmount) * 100) : 0

  const contractValueAmount = Number(contractValue || 0)
  const discountValueAmount = Number(discountAmount || 0)
  const installationFinalTotal = computeFinalBillable(contractValueAmount, discountValueAmount)
  const installationPaidFromDb = persistedPaidAmount
  const installationRemainingAmount = Math.max(installationFinalTotal - installationPaidFromDb, 0)
  const installationOverpaid = installationPaidFromDb > installationFinalTotal && installationFinalTotal > 0
  const installationPaymentValid =
    !Number.isNaN(contractValueAmount) &&
    !Number.isNaN(discountValueAmount) &&
    contractValueAmount > 0 &&
    discountValueAmount >= 0 &&
    discountValueAmount <= contractValueAmount &&
    !installationOverpaid
  const paymentAmountValue = Number(paymentAmount || 0)
  const paymentExceedsRemaining =
    paymentAmountValue > persistedRemainingAmount && persistedRemainingAmount >= 0 && paymentAmountValue > 0
  const inlineInstallPaymentAmountValue = Number(inlineInstallPaymentAmount || 0)
  const inlineInstallPaymentExceeds =
    recordPaymentOnComplete &&
    inlineInstallPaymentAmountValue > installationRemainingAmount &&
    installationRemainingAmount >= 0
  const inlineInstallPaymentValid =
    !recordPaymentOnComplete ||
    (inlineInstallPaymentAmountValue > 0 &&
      inlineInstallPaymentAmountValue <= installationRemainingAmount &&
      Boolean(inlineInstallPaymentDate.trim()) &&
      Boolean(inlineInstallPaymentMethod.trim()))
  const installationSubmitValid = installationPaymentValid && inlineInstallPaymentValid

  const paymentModel = useMemo<PaymentModel>(() => {
    return {
      total: persistedTotalAmount,
      paid: persistedPaidAmount,
      remaining: persistedRemainingAmount,
      status: persistedPaymentStatus
    }
  }, [persistedTotalAmount, persistedPaidAmount, persistedRemainingAmount, persistedPaymentStatus])

  const stageStatusMap = useMemo(() => {
    return buildStageStatusMap({
      status: customer?.status ?? "",
      payment: paymentModel,
      stageHistory: progress?.stage_history ?? [],
      currentWorkflowStage,
    })
  }, [customer?.status, paymentModel, progress?.stage_history, currentWorkflowStage])

  const allowedActionModel = useMemo(() => {
    return getAllowedActions(currentWorkflowStage, customer?.status ?? "", paymentModel)
  }, [currentWorkflowStage, customer?.status, paymentModel])

  const nextActionInfo = useMemo(() => {
    if (!allowedActionModel.primaryAction) return null
    const meta = actionMeta(allowedActionModel.primaryAction)
    return { key: allowedActionModel.primaryAction, label: meta.label, description: meta.description }
  }, [allowedActionModel])

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

    if (modalState.action === "CLOSE_PROJECT" && !completionNotes.trim()) {
      setModalError("Completion notes are required before closing the project.")
      return
    }

    const closureSnapshotForSubmit = derivePersistedPaymentSnapshot(customer)
    if (modalState.action === "CLOSE_PROJECT" && (closureSnapshotForSubmit.remaining > 0 || closureSnapshotForSubmit.status !== "Paid")) {
      setModalError("Full payment is required before closing the project.")
      return
    }

    if (modalState.action === "MARK_INSTALLATION_COMPLETED" && !installationSubmitValid) {
      if (recordPaymentOnComplete && inlineInstallPaymentExceeds) {
        setModalError("Amount exceeds remaining balance.")
      } else if (installationOverpaid) {
        setModalError("Paid amount cannot exceed project value.")
      } else {
        setModalError("Enter valid contract value and payment details.")
      }
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
        if (installationOverpaid) {
          throw new Error("Paid amount cannot exceed project value.")
        }
        if (installationFinalTotal <= 0) {
          throw new Error("Enter a valid contract value.")
        }
        if (recordPaymentOnComplete && inlineInstallPaymentAmountValue > installationRemainingAmount) {
          throw new Error("Amount exceeds remaining balance.")
        }

        setActionProgressMessage("Updating workflow...")
        let remaining = installationRemainingAmount
        let paidAfter = installationPaidFromDb
        const initialStatus = remaining > 0 ? "Completed_Payment_Pending" : "Completed"

        await runWithRetry(() =>
          updateCustomer(customer.id, {
            status: initialStatus,
            current_stage: "INSTALLATION",
            total_cost: installationFinalTotal,
            notes: appendNotes(customer.notes, "Installation Completed", [
              installCompleteNotes || "Marked as completed",
              `Contract Value: ${contractValueAmount.toFixed(2)}`,
              `Discount Amount: ${discountValueAmount.toFixed(2)}`,
              discountReason.trim() ? `Discount Reason: ${discountReason.trim()}` : "",
              `Total Amount: ${installationFinalTotal.toFixed(2)}`,
              `Paid Amount: ${paidAfter.toFixed(2)}`,
              `Remaining Amount: ${remaining.toFixed(2)}`,
              `Payment Status: ${remaining <= 0 ? "Paid" : paidAfter > 0 ? "Partial" : "Pending"}`,
            ]),
          })
        )

        if (recordPaymentOnComplete && inlineInstallPaymentAmountValue > 0) {
          setActionProgressMessage("Recording payment...")
          await createPaymentForInstallation({
            installation_id: customer.id,
            organization_id: customer.organization_id,
            amount: inlineInstallPaymentAmountValue,
            payment_date: inlineInstallPaymentDate,
            payment_method: inlineInstallPaymentMethod,
            notes: buildPaymentRecordNotes(
              "Payment recorded during installation completion",
              inlineInstallPaymentReference,
              inlineInstallPaymentCollectedBy
            ),
          })
          await loadDetail()
          const refreshed = await getCustomerById(customer.id)
          const refreshedCustomer = refreshed.data as CustomerRow | null
          if (refreshedCustomer) {
            const refreshedSnapshot = derivePersistedPaymentSnapshot(refreshedCustomer)
            remaining = refreshedSnapshot.remaining
            paidAfter = refreshedSnapshot.paid
          }
        }

        if (remaining <= 0 && installationFinalTotal > 0) {
          await runWithRetry(() =>
            updateCustomer(customer.id, {
              status: "Completed",
              current_stage: "INSTALLATION",
              payment_status: "Paid",
              total_cost: installationFinalTotal,
              paid_amount: paidAfter,
              pending_amount: 0,
              notes: appendNotes(customer.notes, "Payment Cleared", [
                `Payment Status: Paid`,
                `Total Amount: ${installationFinalTotal.toFixed(2)}`,
                `Paid Amount: ${paidAfter.toFixed(2)}`,
                `Remaining Amount: 0.00`,
                "Project is ready for closure.",
              ]),
            })
          )
          applyLocalStage("Completed", "INSTALLATION")
          setStatusToast("Installation complete — project is ready for closure")
        } else {
          applyLocalStage(initialStatus, "INSTALLATION")
          setStatusToast(
            recordPaymentOnComplete && inlineInstallPaymentAmountValue > 0
              ? "Installation complete — partial payment recorded"
              : "Installation marked complete — payment pending"
          )
        }
      }

      if (modalState.action === "CLOSE_PROJECT") {
        if (!completionNotes.trim()) {
          throw new Error("Please provide completion notes before closing the project.")
        }

        const closureSnapshot = derivePersistedPaymentSnapshot(customer)
        if (closureSnapshot.remaining > 0 || closureSnapshot.status !== "Paid") {
          throw new Error("Full payment is required before closing the project.")
        }

        if (invoiceDoc) {
          setActionProgressMessage("Uploading document...")
          await runWithRetry(() => uploadDocument(invoiceDoc, "project-closure-invoice", customer.id))
        }

        setActionProgressMessage("Closing project...")
        await runWithRetry(() =>
          updateCustomer(customer.id, {
            status: "Completed",
            current_stage: "CLOSED",
            payment_status: "Paid",
            total_cost: closureSnapshot.total,
            paid_amount: closureSnapshot.paid,
            pending_amount: 0,
            notes: appendNotes(customer.notes, "Project Closure", [
              `Payment Status: Paid`,
              `Total Amount: ${closureSnapshot.total.toFixed(2)}`,
              `Paid Amount: ${closureSnapshot.paid.toFixed(2)}`,
              `Remaining Amount: 0.00`,
              `Completion Notes: ${completionNotes}`,
            ]),
          })
        )
        applyLocalStage("Completed", "CLOSED")
        setStatusToast("Project closed successfully")
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
    <div className="w-full space-y-6">
      {statusToast ? (
        <div className="fixed right-5 top-5 z-50 flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-700 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
          <Check className="h-4 w-4" />
          {statusToast}
        </div>
      ) : null}

      <Link href="/customers" className="back-button">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Customers
      </Link>

      {/* ── Loading ── */}
      {loading ? (
        <div className="sf-section-card flex items-center gap-2.5 p-5 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading customer details…
        </div>
      ) : null}

      {/* ── Not found ── */}
      {!loading && error === "Customer not found" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-800">Customer not found.</p>
          <Link href="/customers" className="back-button mt-3">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Customers
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
          <div className="sf-section-card p-5">
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
              <div className="flex shrink-0 flex-row items-center justify-end gap-2 sm:gap-3">
                <span className={`inline-flex items-center rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-all duration-200 ${headerStageBadge(currentStage)} ${statusChipPulse ? "scale-[1.04] shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" : "scale-100"}`}>
                  {businessStageLabel()}
                </span>
                <Link
                  href={`/customers/${customer.id}/edit`}
                  className="btn btn-secondary btn-compact"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Link>
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
          <div className="sf-section-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">Workflow Progress</p>

            {/* Horizontal stepper */}
            <div className="mt-5">
              <div className="relative px-2 sm:px-4">
                <div className="workflow-stepper-track absolute left-[calc(12.5%+0.5rem)] right-[calc(12.5%+0.5rem)] top-5 h-0.5" />
                <div
                  className={`workflow-stepper-progress absolute left-[calc(12.5%+0.5rem)] right-[calc(12.5%+0.5rem)] top-5 h-0.5 origin-left${
                    stageProgressPercent >= 100 ? " workflow-stepper-progress-complete" : ""
                  }`}
                  style={{ transform: `scaleX(${stageProgressPercent / 100})` }}
                />
                <div className="workflow-container relative z-[2]">
                  {stageDefinitions.map((stage) => {
                    const stageStatus = stageStatusMap[stage.key]
                    const isDone = stageStatus.tone === "completed"
                    const isActive = stage.key === currentStage && stageStatus.tone !== "completed"
                    const isBlocked =
                      !isDone &&
                      !isActive &&
                      stage.key === "CLOSURE" &&
                      currentWorkflowStage === "INSTALLATION" &&
                      !allowedActionModel.closureEnabled
                    const visualState: StepVisualState = isDone
                      ? "completed"
                      : isActive
                      ? "active"
                      : isBlocked
                      ? "blocked"
                      : "upcoming"
                    const Icon = iconForStage(stage.key)
                    return (
                      <div key={stage.key} className="workflow-step">
                        <div
                          className={`workflow-step-node flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${stepNodeClass(visualState)}`}
                        >
                          {visualState === "active" ? <span className="workflow-step-pulse-ring" aria-hidden /> : null}
                          {renderStepIndicator(visualState, Icon)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="px-2 sm:px-4">
                <div className="workflow-container mt-2 gap-1">
                  {stageDefinitions.map((stage) => {
                    const stageStatus = stageStatusMap[stage.key]
                    const isDone = stageStatus.tone === "completed"
                    const isActive = stage.key === currentStage && stageStatus.tone !== "completed"
                    const isBlocked =
                      !isDone &&
                      !isActive &&
                      stage.key === "CLOSURE" &&
                      currentWorkflowStage === "INSTALLATION" &&
                      !allowedActionModel.closureEnabled
                    const visualState: StepVisualState = isDone
                      ? "completed"
                      : isActive
                      ? "active"
                      : isBlocked
                      ? "blocked"
                      : "upcoming"
                    return (
                      <p
                        key={`${stage.key}-label`}
                        className={`workflow-step-label ${stepLabelClass(visualState)} ${
                          isActive ? "workflow-step-label-mobile-visible" : "workflow-step-label-mobile-hidden"
                        }`}
                      >
                        <span className="workflow-step-label-full">{stage.title}</span>
                        <span className="workflow-step-label-short">{shortStageLabel(stage.key)}</span>
                      </p>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Next action required — dominant CTA */}
            {currentWorkflowStage !== "CLOSED" ? (
              <div className="next-action mt-5 overflow-hidden">
                <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15">
                    <Zap className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="next-action-title">Next Action Required</p>
                    <p className="next-action-text mt-0.5">{allowedActionModel.guidance}</p>
                  </div>
                  {nextActionInfo ? (
                    <button
                      type="button"
                      onClick={() => openActionModal(nextActionInfo.key)}
                      className="btn btn-primary customer-primary-btn shrink-0"
                    >
                      {nextActionInfo.label}
                    </button>
                  ) : persistedRemainingAmount > 0 && isInstallationCompleteStatus(customer?.status) ? (
                    <button type="button" onClick={openPaymentModal} className="btn btn-primary customer-primary-btn shrink-0">
                      Record Payment
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
               MAIN 2-COLUMN LAYOUT
          ══════════════════════════════════════════ */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
            {/* ── LEFT: Stage Pipeline + Documents ── */}
            <div className="space-y-5">

              {/* Stage Pipeline */}
              <div className="sf-section-card overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-3.5">
                  <h2 className="text-sm font-semibold text-slate-900">Stage Pipeline</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {orderedStages.map((stage) => {
                    const badge = stageStatusMap[stage.key]
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
              <div className="sf-section-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <h2 className="text-sm font-semibold text-slate-900">Documents</h2>
                  {allowedActionModel.allowedActions.includes("SUBMIT_APPROVAL_DOCUMENTS") ? (
                    <button
                      type="button"
                      onClick={() => openActionModal("SUBMIT_APPROVAL_DOCUMENTS")}
                      className="btn btn-secondary btn-compact"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload Document
                    </button>
                  ) : null}
                </div>
                <div className="hidden md:block">
                  <table className="sf-table w-full border-collapse text-sm">
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
                          No documents available yet. Upload documents as the project progresses.
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
                              className="btn btn-secondary btn-compact"
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
                    <div className="px-5 py-10 text-center text-sm text-slate-400">No documents available yet. Upload documents as the project progresses.</div>
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
                          className="btn btn-secondary w-full disabled:opacity-50"
                        >
                          {viewingDocumentId === doc.id ? "Opening…" : "View document"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ── RIGHT: Payment + Tasks + Activity ── */}
            <div className="space-y-5">

              {/* Payment Summary */}
              <div className="sf-section-card overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-3.5">
                  <h2 className="text-sm font-semibold text-slate-900">Payment Summary</h2>
                </div>
                <div className="space-y-3 px-4 py-3.5">
                  <div className="grid gap-3 text-sm grid-cols-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">Total</p>
                      <p className="mt-1 font-semibold text-slate-900 truncate" title={formatCurrency(persistedTotalAmount)}>{formatCompactCurrency(persistedTotalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">Paid</p>
                      <p className="mt-1 font-semibold text-slate-900 truncate" title={formatCurrency(persistedPaidAmount)}>{formatCompactCurrency(persistedPaidAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">Balance</p>
                      <p className={`mt-1 font-semibold truncate ${persistedRemainingAmount > 0 ? "text-amber-600" : "text-slate-900"}`} title={formatCurrency(persistedRemainingAmount)}>{formatCompactCurrency(persistedRemainingAmount)}</p>
                    </div>
                  </div>
                  <div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-600 transition-all duration-300" style={{ width: `${paymentProgressPct}%` }} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500">{paymentProgressPct.toFixed(0)}% collected</span>
                      <span className={`font-semibold ${persistedPaymentStatus === "Paid" ? "text-emerald-600" : persistedPaymentStatus === "Partial" ? "text-amber-600" : "text-slate-600"}`}>
                        {persistedPaymentStatus}
                      </span>
                    </div>
                  </div>
                  {persistedRemainingAmount > 0 ? (
                    <button
                      type="button"
                      onClick={openPaymentModal}
                      className="btn btn-primary w-full customer-primary-btn"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Record Payment
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-[12px] font-semibold text-emerald-700">
                      <CircleCheck className="h-3.5 w-3.5" />
                      Payment Cleared
                    </div>
                  )}
                </div>

                {/* Payment History */}
                {payments.length > 0 ? (
                  <div className="border-t border-slate-100">
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">Recent Payments</p>
                        <button
                          type="button"
                          onClick={() => setPaymentHistoryOpen(true)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition"
                        >
                          View All
                        </button>
                      </div>
                      <div className="space-y-2">
                        {payments.slice(0, 5).map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between text-[13px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-slate-500 shrink-0">{formatDateTimeUTC(payment.payment_date).split(",")[0]}</span>
                              <span className="text-slate-400 shrink-0">•</span>
                              <span className="text-slate-500 truncate">{payment.payment_method}</span>
                            </div>
                            <span className="font-medium text-slate-900 shrink-0 ml-2">{formatCurrency(payment.amount)}</span>
                          </div>
                        ))}
                      </div>
                      {payments.length > 5 ? (
                        <button
                          type="button"
                          onClick={() => setPaymentHistoryOpen(true)}
                          className="mt-2 text-[11px] font-medium text-blue-600 hover:underline"
                        >
                          + {payments.length - 5} more payments
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {/* Installation Stage: Inline payment CTA */}
                {currentWorkflowStage === "INSTALLATION" && persistedRemainingAmount > 0 ? (
                  <div className="border-t border-slate-100 px-4 py-3">
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-center">
                      <p className="text-[11px] font-medium text-amber-700 mb-2">Balance remaining for this installation</p>
                      <button
                        type="button"
                        onClick={openPaymentModal}
                        className="btn btn-secondary btn-compact w-full text-[12px]"
                      >
                        <CreditCard className="h-3 w-3" />
                        Record Remaining Payment
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Tasks */}
              <div className="sf-section-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                  <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
                  {allowedActionModel.allowedActions.includes("START_INSTALLATION") ? (
                    <button
                      type="button"
                      onClick={() => openActionModal("START_INSTALLATION")}
                      className="btn btn-secondary btn-compact"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Task
                    </button>
                  ) : null}
                </div>
                {tasks.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm font-medium text-slate-500">No active tasks for this customer.</p>
                    <p className="mt-1 text-xs text-slate-400">Tasks will appear here when installation begins.</p>
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
              <div className="sf-section-card overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-3.5">
                  <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
                </div>
                {activities.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">No activity recorded yet. Events will appear as the project progresses.</div>
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
        submitDisabled={!installationSubmitValid}
        errorMessage={modalError}
        showRetry={modalRetryable}
        onClose={closeModal}
        onSubmit={() => void runAction()}
        onRetry={() => void runAction()}
      >
        <div className="space-y-4">
          <PaymentSummaryCards
            projectValue={installationFinalTotal > 0 ? installationFinalTotal : persistedTotalAmount}
            paidAmount={installationPaidFromDb}
            remainingAmount={installationRemainingAmount}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--sf-text)]">Contract Value</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={contractValue}
                onChange={(event) => setContractValue(event.target.value)}
                className={`${textFieldClass} ${
                  modalAttempted && contractValueAmount <= 0
                    ? "field-shake border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100"
                    : ""
                }`}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--sf-text)]">Discount Amount</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(event.target.value)}
                className={textFieldClass}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--sf-text)]">Discount Reason</label>
            <input
              value={discountReason}
              onChange={(event) => setDiscountReason(event.target.value)}
              className={textFieldClass}
              placeholder="Optional reason for discount adjustment"
            />
          </div>

          {installationFinalTotal > 0 ? (
            <div className="rounded-lg border border-[var(--sf-card-border)] bg-[color-mix(in_srgb,var(--sf-card-bg)_96%,var(--hover))] px-3 py-2.5 text-[13px] text-[var(--sf-muted-text)]">
              Final billable amount: <span className="font-semibold text-[var(--sf-text)]">{formatCurrency(installationFinalTotal)}</span>
            </div>
          ) : null}

          {installationOverpaid ? (
            <p className="text-xs text-rose-600">Paid amount cannot exceed project value.</p>
          ) : null}

          {installationRemainingAmount > 0 ? (
            <div className="space-y-3">
              <div className="sf-toggle-row">
                <label htmlFor="record-payment-on-complete">Record payment now</label>
                <input
                  id="record-payment-on-complete"
                  type="checkbox"
                  checked={recordPaymentOnComplete}
                  onChange={(event) => setRecordPaymentOnComplete(event.target.checked)}
                />
              </div>

              {recordPaymentOnComplete ? (
                <div className="space-y-3 rounded-lg border border-[var(--sf-card-border)] bg-[color-mix(in_srgb,var(--sf-card-bg)_96%,var(--hover))] p-3">
                  <p className="text-[12px] text-[var(--sf-muted-text)]">
                    Partial payments stay in Payment Pending. Full payment marks the project ready for closure — use Close Project separately.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-[var(--sf-muted-text)]">
                      Amount Paying Now (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      max={installationRemainingAmount > 0 ? installationRemainingAmount : undefined}
                      value={inlineInstallPaymentAmount}
                      onChange={(event) => setInlineInstallPaymentAmount(event.target.value)}
                      placeholder="Enter amount"
                      className={`input h-[44px] w-full [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                        inlineInstallPaymentExceeds ? "field-shake border-rose-300" : ""
                      }`}
                    />
                    {inlineInstallPaymentExceeds ? (
                      <p className="text-xs text-rose-600">Amount exceeds remaining balance.</p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-[var(--sf-muted-text)]">
                        Payment Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={inlineInstallPaymentDate}
                        onChange={(event) => setInlineInstallPaymentDate(event.target.value)}
                        className="input h-[44px] w-full"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-[var(--sf-muted-text)]">
                        Payment Method <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={inlineInstallPaymentMethod}
                        onChange={(event) => setInlineInstallPaymentMethod(event.target.value)}
                        className="dropdown h-[44px] w-full"
                      >
                        <option value="">Select method</option>
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Card">Card</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-[var(--sf-muted-text)]">Reference Number</label>
                      <input
                        value={inlineInstallPaymentReference}
                        onChange={(event) => setInlineInstallPaymentReference(event.target.value)}
                        className="input h-[44px] w-full"
                        placeholder="Txn / cheque / UPI ref"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-[var(--sf-muted-text)]">Collected By</label>
                      <input
                        value={inlineInstallPaymentCollectedBy}
                        onChange={(event) => setInlineInstallPaymentCollectedBy(event.target.value)}
                        className="input h-[44px] w-full"
                        placeholder="Staff name"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--sf-text)]">Completion notes</label>
            <textarea
              value={installCompleteNotes}
              onChange={(event) => setInstallCompleteNotes(event.target.value)}
              rows={3}
              className={areaFieldClass}
              placeholder="Add final completion details"
            />
          </div>
        </div>
      </WorkflowActionModal>

      <WorkflowActionModal
        open={modalState.action === "CLOSE_PROJECT"}
        title="Close Project"
        subtitle="Confirm closure and archive this installation. Full payment must be recorded before closing."
        customerName={customer?.name ?? "Customer"}
        stageLabel={modalStageLabel("CLOSE_PROJECT")}
        submitLabel="Close Project"
        loading={actionLoading === "CLOSE_PROJECT"}
        loadingMessage={actionProgressMessage}
        submitDisabled={!completionNotes.trim()}
        errorMessage={modalError}
        showRetry={modalRetryable}
        onClose={closeModal}
        onSubmit={() => void runAction()}
        onRetry={() => void runAction()}
      >
        <div className="space-y-4">
          <PaymentSummaryCards
            projectValue={persistedTotalAmount}
            paidAmount={persistedPaidAmount}
            remainingAmount={persistedRemainingAmount}
          />

          {persistedRemainingAmount > 0 || persistedPaymentStatus !== "Paid" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-800">
              Outstanding balance must be cleared before closure. Use Record Payment in the sidebar.
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-800">
              Payment is fully collected. You can close this project now.
            </div>
          )}

          <FileDropInput
            label="Upload Document"
            helperText="Attach invoice or closure evidence (optional)"
            file={invoiceDoc}
            onFileChange={setInvoiceDoc}
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--sf-text)]">Completion notes</label>
            <textarea
              value={completionNotes}
              onChange={(event) => setCompletionNotes(event.target.value)}
              rows={3}
              className={`${areaFieldClass} ${
                modalAttempted && !completionNotes.trim() ? "field-shake border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100" : ""
              }`}
              placeholder="Summarize closure details"
            />
            {modalAttempted && !completionNotes.trim() ? <p className="text-xs text-rose-600">Completion notes are required.</p> : null}
          </div>
        </div>
      </WorkflowActionModal>

      <PaymentHistoryModal
        open={paymentHistoryOpen}
        payments={payments as unknown as import("@/services/paymentService").PaymentRow[]}
        onClose={() => setPaymentHistoryOpen(false)}
      />

      <Modal
        open={paymentModalOpen}
        title="Record Payment"
        subtitle={
          payments.length > 0
            ? `${payments.length} ${payments.length === 1 ? "payment" : "payments"} recorded`
            : undefined
        }
        showCloseButton
        panelClassName="sf-modal-panel-wide"
        onClose={closePaymentModal}
        bodyClassName="space-y-4"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={closePaymentModal} disabled={paymentSubmitting} className="btn btn-secondary h-[44px] px-4 text-[13px]">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitPayment()}
              disabled={paymentSubmitting || !paymentAmount || Number(paymentAmount) <= 0 || paymentExceedsRemaining}
              className="btn btn-primary h-[44px] px-5 text-[13px]"
            >
              {paymentSubmitting ? "Recording..." : "Record Payment"}
            </button>
          </div>
        }
      >
        {payments.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              closePaymentModal()
              setPaymentHistoryOpen(true)
            }}
            className="text-[12px] font-medium text-[var(--sf-primary-start)] hover:underline"
          >
            View payment history →
          </button>
        ) : null}

        {paymentError ? <div className="sf-modal-alert">{paymentError}</div> : null}

        <PaymentSummaryCards
          projectValue={persistedTotalAmount}
          paidAmount={persistedPaidAmount}
          remainingAmount={persistedRemainingAmount}
        />

        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[var(--sf-muted-text)]">
            Amount Paying Now (₹) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            max={persistedRemainingAmount > 0 ? persistedRemainingAmount : undefined}
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="Enter amount"
            className={`input h-[44px] w-full [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
              paymentExceedsRemaining ? "field-shake border-rose-300" : ""
            }`}
            disabled={paymentSubmitting}
          />
          {paymentExceedsRemaining ? <p className="text-xs text-rose-600">Amount exceeds remaining balance.</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--sf-muted-text)]">
              Payment Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="input h-[44px] w-full"
              disabled={paymentSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--sf-muted-text)]">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="dropdown h-[44px] w-full"
              disabled={paymentSubmitting}
            >
              <option value="">Select method</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--sf-muted-text)]">Reference Number</label>
            <input
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="input h-[44px] w-full"
              placeholder="Txn / cheque / UPI ref"
              disabled={paymentSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--sf-muted-text)]">Collected By</label>
            <input
              value={paymentCollectedBy}
              onChange={(e) => setPaymentCollectedBy(e.target.value)}
              className="input h-[44px] w-full"
              placeholder="Team member name"
              disabled={paymentSubmitting}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[var(--sf-muted-text)]">
            Payment Proof <span className="text-[11px] font-normal">(optional)</span>
          </label>
          <div
            className={`file-dropzone ${paymentProofFile ? "drag-active" : ""}`}
            onClick={() => document.getElementById("payment-proof-input")?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files?.[0]
              if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
                setPaymentProofFile(file)
              }
            }}
          >
            {paymentProofFile ? (
              <div className="flex flex-col items-center gap-1 py-1">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-[var(--sf-primary-start)]" />
                  <span className="max-w-[200px] truncate text-[13px] font-medium text-[var(--sf-text)]">{paymentProofFile.name}</span>
                </div>
                <span className="text-[11px] text-[var(--sf-muted-text)]">{(paymentProofFile.size / 1024).toFixed(0)} KB</span>
              </div>
            ) : (
              <div className="py-1 text-center">
                <Upload className="mx-auto h-5 w-5 text-[var(--sf-muted-text)]" />
                <p className="mt-1.5 text-[12px] text-[var(--sf-muted-text)]">Drop image/PDF or click to upload</p>
              </div>
            )}
          </div>
          <input
            id="payment-proof-input"
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              if (file && file.size > 5 * 1024 * 1024) {
                setPaymentError("File must be less than 5MB.")
                return
              }
              setPaymentProofFile(file)
            }}
            disabled={paymentSubmitting}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[var(--sf-muted-text)]">Notes</label>
          <textarea
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="Optional notes"
            rows={2}
            className="textarea w-full"
            disabled={paymentSubmitting}
          />
        </div>
      </Modal>
    </div>
  )
}
