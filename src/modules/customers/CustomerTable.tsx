"use client"

import Link from "next/link"
import Pagination from "../../components/ui/Pagination"
import LoadingButton from "../../components/ui/LoadingButton"
import { formatDateTimeUTC } from "../../utils/dateFormat"

export type CustomerRow = {
  id: string
  name: string
  phone: string | null
  email: string | null
  company: string | null
  address: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  assigned_to: string | null
  system_id: string | null
  status: string
  current_stage?: string | null
  notes?: string | null
  created_at: string
}

type CustomerTableProps = {
  rows: CustomerRow[]
  loading: boolean
  deletingId?: string | null
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onEdit: (row: CustomerRow) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
}

function toWorkflowStage(status: string | null | undefined) {
  const normalized = (status ?? "").toLowerCase().trim()

  if (normalized.includes("closed") || normalized.includes("inactive") || normalized.includes("completed")) {
    return "Closed"
  }
  if (normalized.includes("install")) {
    return "Installation"
  }
  if (normalized.includes("gov") || normalized.includes("approval") || normalized.includes("submit") || normalized.includes("active")) {
    return "Govt Approval Pending"
  }
  return "Created"
}

function normalizeStageLabel(stage: string | null | undefined) {
  const normalized = (stage ?? "").toUpperCase().trim()
  if (normalized === "SUBMITTED") return "Govt Approval Pending"
  if (normalized === "APPROVED") return "Govt Approval Pending"
  if (normalized === "INSTALLATION") return "Installation"
  if (normalized === "CLOSED") return "Closed"
  if (normalized === "CREATED") return "Created"
  return toWorkflowStage(stage)
}

function stageBadgeClass(stage: string) {
  if (stage === "Closed") return "bg-emerald-50 text-emerald-700 ring-emerald-200"
  if (stage === "Installation") return "bg-blue-50 text-blue-700 ring-blue-200"
  if (stage === "Govt Approval Pending") return "bg-amber-50 text-amber-700 ring-amber-200"
  return "bg-slate-100 text-slate-700 ring-slate-200"
}

function deriveLocation(row: CustomerRow) {
  const parts = [row.city, row.state, row.country].filter(Boolean)
  if (parts.length > 0) {
    return parts.join(", ")
  }
  return row.address || "-"
}

function deriveSystemCapacity(row: CustomerRow) {
  const note = row.notes ?? ""
  const matched = note.match(/(\d+(?:\.\d+)?)\s*(kw|kW|KW)/)
  if (matched?.[1]) {
    return `${matched[1]} kW`
  }
  return "-"
}

export default function CustomerTable({
  rows,
  loading,
  deletingId,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onEdit,
  onDelete
}: CustomerTableProps) {
  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize))

  return (
    <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="w-full overflow-x-auto">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-3 font-medium">Customer Name</th>
              <th className="px-3 py-3 font-medium">Phone</th>
              <th className="px-3 py-3 font-medium">Location</th>
              <th className="px-3 py-3 font-medium">System Capacity</th>
              <th className="px-3 py-3 font-medium">Current Stage</th>
              <th className="px-3 py-3 font-medium">Last Updated</th>
              <th className="px-3 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  Loading customers...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  No customers found
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const stage = row.current_stage ? normalizeStageLabel(row.current_stage) : toWorkflowStage(row.status)
                return (
                  <tr key={row.id} className="align-top">
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-800">{row.name}</div>
                      <div className="text-xs text-slate-500">{row.email || row.company || "-"}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{row.phone || "-"}</td>
                    <td className="px-3 py-3 text-slate-700">{deriveLocation(row)}</td>
                    <td className="px-3 py-3 text-slate-700">{deriveSystemCapacity(row)}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${stageBadgeClass(stage)}`}>
                        {stage}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{formatDateTimeUTC(row.created_at)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/customers/${row.id}`} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <LoadingButton
                          type="button"
                          loading={deletingId === row.id}
                          loadingLabel="Deleting..."
                          onClick={() => onDelete(row.id)}
                          className="border border-rose-200 px-2 py-1 text-xs text-rose-600"
                        >
                          Delete
                        </LoadingButton>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
    </section>
  )
}
