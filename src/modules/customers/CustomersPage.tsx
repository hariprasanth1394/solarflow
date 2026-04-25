"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, Search, Users } from "lucide-react"
import AddCustomerModal from "./AddCustomerModal"
import CustomerTable, { type CustomerRow } from "./CustomerTable"
import Card from "@/components/ui/Card"
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
  { value: "INSTALLATION_COMPLETED_PARTIAL_PAYMENT", label: "Installation Completed - Partial Payment" },
  { value: "CLOSED", label: "Completed" },
]

export default function CustomersPage() {
  const [rows, setRows] = useState<CustomerRow[]>([])
  const [dashboardCounts, setDashboardCounts] = useState({ total: 0, created: 0, governmentApproval: 0, installation: 0, closed: 0 })
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
      const { data, count, counts } = await getCustomers({ search, page, pageSize, status: statusFilter })
      setRows((data ?? []) as unknown as CustomerRow[])
      setTotalCount(count ?? 0)
      setDashboardCounts(counts ?? { total: 0, created: 0, governmentApproval: 0, installation: 0, closed: 0 })
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

  function openAddModal() {
    setEditing(null)
    setModalOpen(true)
  }

  return (
    <div className={inventoryPageContainerClass}>

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-slate-900">Customers</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage customer pipeline and installation lifecycle</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Card padded>
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">Total Customers</p>
          <p className="mt-3 text-[28px] font-semibold leading-[1.2] tabular-nums text-slate-900">{dashboardCounts.total}</p>
        </Card>
        <Card padded>
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">Active Projects</p>
          <p className="mt-3 text-[28px] font-semibold leading-[1.2] tabular-nums text-slate-900">{dashboardCounts.installation}</p>
        </Card>
        <Card padded>
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">Pending Approvals</p>
          <p className="mt-3 text-[28px] font-semibold leading-[1.2] tabular-nums text-slate-900">{dashboardCounts.governmentApproval}</p>
        </Card>
        <Card padded>
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">Completed Installations</p>
          <p className="mt-3 text-[28px] font-semibold leading-[1.2] tabular-nums text-slate-900">{dashboardCounts.closed}</p>
        </Card>
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
            className="input pl-9 pr-3"
          />
        </div>

        {/* Stage filter */}
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="dropdown"
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
