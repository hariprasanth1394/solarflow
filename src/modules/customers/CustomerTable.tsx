"use client"

import { memo, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, MoreHorizontal, Pencil, Trash2, UserPlus } from "lucide-react"
import InventoryTablePager from "../inventory/components/InventoryTablePager"
import {
  inventoryTableCellClass,
  inventoryTableClass,
  inventoryTableHeaderCellClass,
  inventoryTableHeaderRowClass,
  inventoryTableStickyHeaderCellClass,
  inventoryTableRowClass,
  inventoryTableWrapperClass,
  inventoryMobileCardClass,
  inventoryInlineMenuClass,
} from "../inventory/components/inventoryTableStyles"
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
  onPageSizeChange: (pageSize: number) => void
  onEdit: (row: CustomerRow) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
  onAddCustomer?: () => void
}

function toWorkflowStage(status: string | null | undefined) {
  const normalized = (status ?? "").toLowerCase().trim()
  if (normalized.includes("closed") || normalized.includes("inactive") || normalized.includes("completed")) return "Closed"
  if (normalized.includes("install")) return "Installation"
  if (normalized.includes("gov") || normalized.includes("approval") || normalized.includes("submit") || normalized.includes("active")) return "Approval Pending"
  return "Created"
}

function normalizeStageLabel(stage: string | null | undefined) {
  const normalized = (stage ?? "").toUpperCase().trim()
  if (normalized === "SUBMITTED" || normalized === "APPROVED" || normalized === "GOVT APPROVAL PENDING") return "Approval Pending"
  if (normalized === "INSTALLATION") return "Installation"
  if (normalized === "CLOSED") return "Closed"
  if (normalized === "CREATED") return "Created"
  return toWorkflowStage(stage)
}

function stageBadgeStyle(stage: string): string {
  if (stage === "Closed") return "bg-emerald-50 text-emerald-700"
  if (stage === "Installation") return "bg-blue-50 text-blue-700"
  if (stage === "Approval Pending") return "bg-amber-50 text-amber-700"
  return "bg-slate-100 text-slate-600"
}

function deriveLocation(row: CustomerRow) {
  const parts = [row.city, row.state, row.country].filter(Boolean)
  if (parts.length > 0) return parts.join(", ")
  return row.address || "-"
}

function deriveSystemCapacity(row: CustomerRow) {
  const note = row.notes ?? ""
  const matched = note.match(/(\d+(?:\.\d+)?)\s*(kw|kW|KW)/)
  if (matched?.[1]) return `${matched[1]} kW`
  return "-"
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function CustomerTable({
  rows,
  loading,
  deletingId,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onAddCustomer,
}: CustomerTableProps) {
  const router = useRouter()
  const [openActionRowId, setOpenActionRowId] = useState<string | null>(null)
  const actionMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!actionMenuRef.current) return
      if (!actionMenuRef.current.contains(event.target as Node)) setOpenActionRowId(null)
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  return (
    <div className={inventoryTableWrapperClass}>
      <div className="hidden overflow-x-auto md:block">
        <table className={`min-w-[900px] ${inventoryTableClass}`}>
          <thead>
            <tr className={inventoryTableHeaderRowClass}>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[24%]`}>Customer</th>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[13%]`}>Contact</th>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[18%]`}>Location</th>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[10%]`}>Capacity</th>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[13%]`}>Stage</th>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[14%]`}>Last Updated</th>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[8%] text-right`}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className={inventoryTableRowClass}>
                  <td className={inventoryTableCellClass} colSpan={7}>
                    <div className="h-4 w-full animate-pulse rounded-sm bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-14 text-center">
                  <div className="mx-auto max-w-sm space-y-2">
                    <p className="text-base font-semibold text-slate-900">No customers found</p>
                    <p className="text-sm text-slate-500">Try adjusting your search or filters, or add a new customer.</p>
                    {onAddCustomer ? (
                      <button
                        type="button"
                        onClick={onAddCustomer}
                        className="btn btn-primary mx-auto"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add customer
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const stage = row.current_stage ? normalizeStageLabel(row.current_stage) : toWorkflowStage(row.status)
                const initials = getInitials(row.name || "?")
                const avatarCls = avatarColor(row.name || "")
                return (
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/customers/${row.id}`)}
                    className={`cursor-pointer ${inventoryTableRowClass} hover:bg-[#F8FAFC]`}
                  >
                    {/* Customer */}
                    <td className={inventoryTableCellClass}>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarCls}`}>
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">{row.name}</div>
                          <div className="truncate text-[12px] text-slate-400">{row.email || row.company || "-"}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className={`${inventoryTableCellClass} text-slate-700`}>{row.phone || "-"}</td>

                    {/* Location */}
                    <td className={`${inventoryTableCellClass} text-slate-700`}>{deriveLocation(row)}</td>

                    {/* Capacity */}
                    <td className={`${inventoryTableCellClass} tabular-nums text-slate-700`}>{deriveSystemCapacity(row)}</td>

                    {/* Stage */}
                    <td className={inventoryTableCellClass}>
                      <span className={`inline-flex items-center rounded-[6px] px-2.5 py-1 text-[12px] font-medium ${stageBadgeStyle(stage)}`}>
                        {stage}
                      </span>
                    </td>

                    {/* Last Updated */}
                    <td className={`${inventoryTableCellClass} text-slate-500`}>{formatDateTimeUTC(row.created_at)}</td>

                    {/* Actions */}
                    <td
                      className={`${inventoryTableCellClass} text-right`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative inline-block" ref={openActionRowId === row.id ? actionMenuRef : null}>
                        <button
                          type="button"
                          onClick={() => setOpenActionRowId((cur) => (cur === row.id ? null : row.id))}
                          className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 transition duration-150 hover:bg-slate-200/70 hover:text-slate-800 focus:outline-none"
                          aria-label={`Open actions for ${row.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {openActionRowId === row.id ? (
                          <div className={inventoryInlineMenuClass}>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionRowId(null)
                                router.push(`/customers/${row.id}`)
                              }}
                              className="dropdown-item flex items-center gap-2.5"
                            >
                              <Eye className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              View details
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionRowId(null)
                                void onEdit(row)
                              }}
                              className="dropdown-item flex items-center gap-2.5"
                            >
                              <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              Edit customer
                            </button>
                            <div className="my-1 border-t border-slate-100" />
                            <button
                              type="button"
                              disabled={deletingId === row.id}
                              onClick={() => {
                                setOpenActionRowId(null)
                                void onDelete(row.id)
                              }}
                              className="dropdown-item flex items-center gap-2.5 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5 shrink-0" />
                              {deletingId === row.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 md:hidden">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={`mobile-skeleton-${index}`} className="space-y-3 px-4 py-4">
              <div className="h-4 w-2/5 animate-pulse rounded-sm bg-slate-100" />
              <div className="h-3 w-4/5 animate-pulse rounded-sm bg-slate-100" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-base font-semibold text-slate-900">No customers found</p>
            <p className="mt-2 text-sm text-slate-500">Try adjusting your search or filters, or add a new customer.</p>
            {onAddCustomer ? (
              <button type="button" onClick={onAddCustomer} className="btn btn-primary mx-auto mt-4">
                <UserPlus className="h-4 w-4" />
                Add customer
              </button>
            ) : null}
          </div>
        ) : (
          rows.map((row) => {
            const stage = row.current_stage ? normalizeStageLabel(row.current_stage) : toWorkflowStage(row.status)
            const initials = getInitials(row.name || "?")
            const avatarCls = avatarColor(row.name || "")

            return (
              <div key={row.id} className="px-4 py-4">
                <div onClick={() => router.push(`/customers/${row.id}`)} className={`space-y-4 ${inventoryMobileCardClass}`}>
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarCls}`}>
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{row.phone || row.email || row.company || "-"}</p>
                        </div>
                        <span className={`inline-flex min-h-8 items-center rounded-[6px] px-2.5 py-1 text-[12px] font-medium ${stageBadgeStyle(stage)}`}>
                          {stage}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Capacity</p>
                      <p className="mt-1 font-medium text-slate-800">{deriveSystemCapacity(row)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Created</p>
                      <p className="mt-1 font-medium text-slate-800">{formatDateTimeUTC(row.created_at)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Location</p>
                      <p className="mt-1 text-slate-600">{deriveLocation(row)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        router.push(`/customers/${row.id}`)
                      }}
                      className="btn btn-secondary flex-1"
                    >
                      View details
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        void onEdit(row)
                      }}
                      className="btn btn-secondary flex-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === row.id}
                      onClick={(event) => {
                        event.stopPropagation()
                        void onDelete(row.id)
                      }}
                      className="btn btn-secondary flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === row.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <InventoryTablePager
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        itemLabel="customers"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  )
}

export default memo(CustomerTable)
