"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, Search, Users } from "lucide-react"
import AddCustomerModal from "./AddCustomerModal"
import CustomerTable, { type CustomerRow } from "./CustomerTable"
import { createCustomer, deleteCustomer, getAssignableSalesReps, getCustomers, updateCustomer } from "../../services/customerService"
import { getAvailableSolarSystems, type AvailableSolarSystem } from "../../services/inventoryService"
import {
  inventoryPageContainerClass,
  inventorySectionCardClass,
  inventoryTableWrapperClass,
} from "../inventory/components/inventoryTableStyles"

type SalesRep = { id: string; name: string | null; email: string | null }

const pageSize = 10

const stageOptions = [
  { value: "All", label: "All Stages" },
  { value: "CREATED", label: "Created" },
  { value: "GOVERNMENT_APPROVAL", label: "Government Approval" },
  { value: "INSTALLATION", label: "Installation" },
  { value: "CLOSED", label: "Completed" },
]

export default function CustomersPage() {
  const [rows, setRows] = useState<CustomerRow[]>([])
  const [salesReps, setSalesReps] = useState<SalesRep[]>([])
  const [availableSystems, setAvailableSystems] = useState<AvailableSolarSystem[]>([])
  const [systemsLoading, setSystemsLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerRow | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    setErrorMessage("")
    try {
      const { data, count } = await getCustomers({ search, page, pageSize, status: statusFilter })
      setRows((data ?? []) as unknown as CustomerRow[])
      setTotalCount(count ?? 0)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Operation failed")
    } finally {
      setLoading(false)
    }
  }, [search, page, statusFilter])

  const fetchSalesReps = useCallback(async () => {
    try {
      const reps = await getAssignableSalesReps()
      setSalesReps((reps ?? []) as SalesRep[])
    } catch {
      setSalesReps([])
    }
  }, [])

  const fetchAvailableSystems = useCallback(async () => {
    setSystemsLoading(true)
    try {
      const { data } = await getAvailableSolarSystems()
      setAvailableSystems(data ?? [])
    } catch {
      setAvailableSystems([])
    } finally {
      setSystemsLoading(false)
    }
  }, [])

  useEffect(() => { void fetchCustomers() }, [fetchCustomers])
  useEffect(() => { void fetchSalesReps() }, [fetchSalesReps])
  useEffect(() => { void fetchAvailableSystems() }, [fetchAvailableSystems])

  // Derive stats from current rows (all pages combined via totalCount)
  const stats = useMemo(() => {
    const activeProjects = rows.filter((r) => {
      const s = (r.current_stage ?? r.status ?? "").toLowerCase()
      return s.includes("install")
    }).length

    const pendingApprovals = rows.filter((r) => {
      const s = (r.current_stage ?? r.status ?? "").toLowerCase()
      return s.includes("gov") || s.includes("approval") || s.includes("submit")
    }).length

    const completed = rows.filter((r) => {
      const s = (r.current_stage ?? r.status ?? "").toLowerCase()
      return s.includes("closed") || s.includes("inactive") || s.includes("completed")
    }).length

    return { activeProjects, pendingApprovals, completed }
  }, [rows])

  function openAddModal() {
    setEditing(null)
    setModalOpen(true)
  }

  return (
    <div className={inventoryPageContainerClass}>

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Customers</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage customer pipeline and installation lifecycle</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className={inventorySectionCardClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">Total Customers</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{totalCount}</p>
        </div>
        <div className={inventorySectionCardClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">Active Projects</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{stats.activeProjects}</p>
        </div>
        <div className={inventorySectionCardClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">Pending Approvals</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{stats.pendingApprovals}</p>
        </div>
        <div className={inventorySectionCardClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">Completed Installations</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{stats.completed}</p>
        </div>
      </div>

      {/* ── Toolbar (Spare-style card controls) ── */}
      <section className={`${inventorySectionCardClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search customers, phone, location, system…"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Stage filter */}
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {stageOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ── Alerts ── */}
      {errorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>
      ) : null}

      {/* ── Table ── */}
      <CustomerTable
        rows={rows}
        loading={loading}
        deletingId={deletingId}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        onAddCustomer={openAddModal}
        onEdit={(row) => {
          setEditing(row)
          setModalOpen(true)
        }}
        onDelete={async (id) => {
          setDeletingId(id)
          setErrorMessage("")
          try {
            await deleteCustomer(id)
            setSuccessMessage("Customer deleted successfully")
            await fetchCustomers()
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Operation failed")
          } finally {
            setDeletingId(null)
          }
        }}
      />

      {/* ── Add / Edit Modal ── */}
      <AddCustomerModal
        open={modalOpen}
        loading={saving}
        systemsLoading={systemsLoading}
        salesReps={salesReps}
        availableSystems={availableSystems}
        initialValue={editing}
        onClose={() => { if (!saving) setModalOpen(false) }}
        onSubmit={async (payload) => {
          setSaving(true)
          setErrorMessage("")
          try {
            if (editing) {
              await updateCustomer(editing.id, payload)
              setSuccessMessage("Customer updated successfully")
            } else {
              await createCustomer(payload)
              setSuccessMessage("Customer added successfully")
            }
            setModalOpen(false)
            setEditing(null)
            await fetchCustomers()
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Operation failed")
          } finally {
            setSaving(false)
          }
        }}
      />
    </div>
  )
}
