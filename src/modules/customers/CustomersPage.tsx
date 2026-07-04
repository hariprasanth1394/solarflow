"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, Search, Users } from "lucide-react"
import ModulePageHeader from "@/components/layout/ModulePageHeader"
import AddCustomerModal from "./AddCustomerModal"
import CustomerTable, { type CustomerRow } from "./CustomerTable"
import Card from "@/components/ui/Card"
import { createCustomer, deleteCustomer, getAssignableSalesReps, getCustomers, updateCustomer } from "../../services/customerService"
import { getAvailableSolarSystems, type AvailableSolarSystem } from "../../services/inventoryService"
import { toast } from "@/lib/toastStore"
import {
  inventoryPageContainerClass,
  inventorySectionCardClass,
  inventoryTableWrapperClass,
} from "../inventory/components/inventoryTableStyles"
import { INVENTORY_PAGE_SIZE_OPTIONS } from "../inventory/components/InventoryTablePager"

type SalesRep = { id: string; name: string | null; email: string | null }

const ROW_SIZE_OPTIONS = INVENTORY_PAGE_SIZE_OPTIONS

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
  const [pageSize, setPageSize] = useState<number>(ROW_SIZE_OPTIONS[0])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerRow | null>(null)
  const [errorMessage, setErrorMessage] = useState("")

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [pageSize, totalCount])

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
  }, [search, page, pageSize, statusFilter])

  useEffect(() => {
    setPage((currentPage) => {
      const nextPage = Math.min(Math.max(1, currentPage), totalPages)
      return nextPage === currentPage ? currentPage : nextPage
    })
  }, [totalPages])

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setPage(Math.min(Math.max(1, nextPage), totalPages))
    },
    [totalPages]
  )

  const handlePageSizeChange = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize)
    setPage(1)
  }, [])

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

      <ModulePageHeader
        title="Customers"
        icon={Users}
        actions={
          <button
            type="button"
            onClick={openAddModal}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        }
      />

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
        <div className="search-input-wrapper flex-1">
          <Search className="search-input-icon" />
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search customers, phone, location, system…"
            className="search-input"
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
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{errorMessage}</p>
      ) : null}

      {/* ── Table ── */}
      <CustomerTable
        rows={rows}
        loading={loading}
        deletingId={deletingId}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
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
            toast.success("Customer deleted", "The customer was removed successfully.")
            await fetchCustomers()
          } catch (error) {
            const message = error instanceof Error ? error.message : "Operation failed"
            setErrorMessage(message)
            toast.error("Delete failed", message)
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
              // normalize nullable numeric fields from the form into undefined for service/repository
              const normalized: any = { ...payload }
              if (normalized.total_cost === null) normalized.total_cost = undefined
              if (normalized.paid_amount === null) normalized.paid_amount = undefined

              if (editing) {
                await updateCustomer(editing.id, normalized)
                setModalOpen(false)
                setEditing(null)
                toast.success("Customer updated", "Changes were saved successfully.")
              } else {
                await createCustomer(normalized)
                setModalOpen(false)
                setEditing(null)
                toast.success("Customer added", "The new customer was created successfully.")
              }
              await fetchCustomers()
            } catch (error) {
              const message = error instanceof Error ? error.message : "Operation failed"
              setErrorMessage(message)
              toast.error("Save failed", message)
            } finally {
              setSaving(false)
            }
          }}
      />
    </div>
  )
}
