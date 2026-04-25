"use client"

import { useMemo, useState } from "react"
import LoadingButton from "../../components/ui/LoadingButton"
import type { AvailableSolarSystem } from "../../services/inventoryService"

type SalesRep = { id: string; name: string | null; email: string | null }

type CustomerPayload = {
  name: string
  phone: string | null
  email: string | null
  company: string | null
  address: string | null
  system_id: string | null
  assigned_to: string | null
  status: string
}

const emptyForm: CustomerPayload = {
  name: "",
  phone: null,
  email: null,
  company: null,
  address: null,
  system_id: null,
  assigned_to: null,
  status: "Created"
}

// Inner component - no effects, state initialized from props
function CustomerModalForm({
  initialValue,
  loading,
  systemsLoading,
  salesReps,
  availableSystems,
  onClose,
  onSubmit,
}: {
  initialValue?: CustomerPayload | null
  loading: boolean
  systemsLoading: boolean
  salesReps: SalesRep[]
  availableSystems: AvailableSolarSystem[]
  onClose: () => void
  onSubmit: (payload: CustomerPayload) => Promise<void>
}) {
  const [form, setForm] = useState<CustomerPayload>(initialValue ?? emptyForm)
  const disabled = useMemo(() => !form.name.trim() || loading, [form.name, loading])
  const selectedSystem = useMemo(
    () => availableSystems.find((system) => system.system_id === form.system_id) ?? null,
    [availableSystems, form.system_id]
  )
  const selectedCapacity = selectedSystem?.capacity_kw ?? null
  const noSystemsAvailable = !systemsLoading && availableSystems.length === 0

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        <form
          className="card my-6 w-full max-w-2xl p-4 shadow-2xl sm:p-5"
          onSubmit={async (event) => {
            event.preventDefault()
            await onSubmit(form)
          }}
        >
          <h3 className="text-lg font-semibold text-gray-900">{initialValue ? "Edit Customer" : "Add Customer"}</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Name"
              className="input"
              required
            />
            <input
              value={form.phone ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value || null }))}
              placeholder="Phone"
              className="input"
            />
            <input
              value={form.email ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value || null }))}
              placeholder="Email"
              className="input"
            />
            <input
              value={form.company ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value || null }))}
              placeholder="Company"
              className="input"
            />
            <input
              value={form.address ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value || null }))}
              placeholder="Address"
              className="input md:col-span-2"
            />
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Package Type</label>
              <p className="mb-2 text-xs text-slate-500">Available installations based on current inventory.</p>
              <select
                value={form.system_id ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, system_id: event.target.value || null }))}
                className="dropdown disabled:opacity-50"
                disabled={systemsLoading || noSystemsAvailable}
              >
                <option value="">
                  {systemsLoading ? "Loading available systems..." : noSystemsAvailable ? "No systems available" : "Select package"}
                </option>
                {availableSystems.map((system) => (
                  <option key={system.system_id ?? `${system.system_name}-${system.capacity_kw}`} value={system.system_id ?? ""}>
                    {`${system.system_name ?? "System"} (${system.capacity_kw ?? 0} kW) - ${system.available_systems ?? 0} available`}
                  </option>
                ))}
              </select>
              {noSystemsAvailable ? (
                <p className="mt-2 text-xs text-amber-700">No solar systems available. Please update inventory.</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">System Capacity</label>
              <input
                value={selectedCapacity !== null ? `${selectedCapacity}` : ""}
                placeholder="Auto-filled from selected package"
                className="input bg-slate-50"
                readOnly
              />
            </div>
            <select
              value={form.assigned_to ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, assigned_to: event.target.value || null }))}
              className="dropdown"
            >
              <option value="">Assign sales rep</option>
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name || rep.email || rep.id}
                </option>
              ))}
            </select>
            <select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              className="dropdown"
            >
              <option value="Created">Created</option>
              <option value="Govt Approval Pending">Govt Approval Pending</option>
              <option value="Installation">Installation</option>
              <option value="Closed">Closed</option>
              <option value="Lead">Lead</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="btn btn-secondary w-full sm:w-auto">
              Cancel
            </button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingLabel="Saving..."
              disabled={disabled}
              className="btn btn-primary w-full sm:w-auto"
            >
              {initialValue ? "Update Customer" : "Add Customer"}
            </LoadingButton>
          </div>
        </form>
      </div>
    </>
  )
}

type AddCustomerModalProps = {
  open: boolean
  loading: boolean
  systemsLoading: boolean
  salesReps: SalesRep[]
  availableSystems: AvailableSolarSystem[]
  initialValue?: CustomerPayload | null
  onClose: () => void
  onSubmit: (payload: CustomerPayload) => Promise<void>
}

export default function AddCustomerModal(props: AddCustomerModalProps) {
  if (!props.open) return null

  // Use a key based on initialValue to force remount when modal opens with different data
  // This resets all internal state automatically without needing effects with setState
  const modalKey = `customer-modal-${props.initialValue?.name ?? "new"}`

  return (
    <CustomerModalForm
      key={modalKey}
      initialValue={props.initialValue}
      loading={props.loading}
      systemsLoading={props.systemsLoading}
      salesReps={props.salesReps}
      availableSystems={props.availableSystems}
      onClose={props.onClose}
      onSubmit={props.onSubmit}
    />
  )
}
