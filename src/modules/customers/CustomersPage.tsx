"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import SearchFilterBar from "../../components/forms/SearchFilterBar"
import AddCustomerModal from "./AddCustomerModal"
import CustomerTable, { type CustomerRow } from "./CustomerTable"
import { createCustomer, deleteCustomer, getAssignableSalesReps, getCustomers, updateCustomer } from "../../services/customerService"
import { getAvailableSolarSystems, type AvailableSolarSystem } from "../../services/inventoryService"

type SalesRep = { id: string; name: string | null; email: string | null }

const pageSize = 10

const statusOptions = [
  "All",
  "Created",
  "Govt Approval Pending",
  "Installation",
  "Closed",
  "Lead",
  "Active",
  "Inactive"
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
      setRows(((data ?? []) as unknown as CustomerRow[]))
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

  useEffect(() => {
    void fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    void fetchSalesReps()
  }, [fetchSalesReps])

  useEffect(() => {
    void fetchAvailableSystems()
  }, [fetchAvailableSystems])

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900">Customers</h2>
        <p className="mt-1 text-sm text-gray-600">Track customer journey and solar installation workflow from creation to closure.</p>
      </section>

      <SearchFilterBar
        search={search}
        onSearchChange={(value: string) => {
          setSearch(value)
          setPage(1)
        }}
        placeholder="Search customer name, phone, location, company"
        filters={
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        }
        actions={
          <Link href="/customers/add" className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white">
            Add Customer
          </Link>
        }
      />

      {errorMessage ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}
      {successMessage ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p> : null}

      <CustomerTable
        rows={rows}
        loading={loading}
        deletingId={deletingId}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
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

      <AddCustomerModal
        open={modalOpen}
        loading={saving}
        systemsLoading={systemsLoading}
        salesReps={salesReps}
        availableSystems={availableSystems}
        initialValue={editing}
        onClose={() => {
          if (!saving) {
            setModalOpen(false)
          }
        }}
        onSubmit={async (payload) => {
          setSaving(true)
          setErrorMessage("")
          try {
            if (editing) {
              await updateCustomer(editing.id, payload)
              setSuccessMessage("Customer updated successfully")
            } else {
              await createCustomer(payload)
              setSuccessMessage("Customer created successfully")
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
