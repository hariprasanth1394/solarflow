"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getCustomerById, updateCustomer } from "@/services/customerService"
import { validateUUID } from "@/utils/validateUUID"

type CustomerEditModel = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  notes: string | null
  status: string
}

const primaryButtonClass =
  "btn btn-primary"

export default function CustomerEditPage() {
  const router = useRouter()
  const params = useParams<{ id?: string | string[] }>()
  const rawId = params?.id
  const customerId = Array.isArray(rawId) ? rawId[0] : rawId

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    notes: "",
    status: "Created"
  })

  useEffect(() => {
    const load = async () => {
      if (!customerId || !validateUUID(customerId)) {
        router.replace("/customers")
        return
      }

      setLoading(true)
      setError("")
      try {
        const { data } = await getCustomerById(customerId)
        const customer = data as CustomerEditModel | null
        if (!customer) {
          setError("Customer not found")
          return
        }

        setForm({
          name: customer.name || "",
          email: customer.email || "",
          phone: customer.phone || "",
          address: customer.address || "",
          city: customer.city || "",
          state: customer.state || "",
          notes: customer.notes || "",
          status: customer.status || "Created"
        })
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Operation failed")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [customerId, router])

  if (!customerId) return null

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h1 className="text-2xl font-semibold text-gray-900">Edit Customer</h1>
        <p className="mt-1 text-sm text-gray-600">Update customer information and save changes.</p>
      </section>

      <section className="card p-5">
        {loading ? <p className="text-sm text-gray-500">Loading customer data...</p> : null}
        {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        {!loading && !error ? (
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault()
              if (!customerId || !form.name.trim()) return
              setSaving(true)
              setError("")
              try {
                await updateCustomer(customerId, {
                  name: form.name.trim(),
                  email: form.email.trim() || null,
                  phone: form.phone.trim() || null,
                  address: form.address.trim() || null,
                  city: form.city.trim() || null,
                  state: form.state.trim() || null,
                  notes: form.notes.trim() || null,
                  status: form.status || "Created"
                })
                router.push(`/customers/${customerId}`)
                router.refresh()
              } catch {
                setError("Failed to update customer")
              } finally {
                setSaving(false)
              }
            }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Customer Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="input"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Phone</span>
              <input
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Status</span>
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
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-sm font-medium text-gray-700">Address</span>
              <input
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">City</span>
              <input
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">State</span>
              <input
                value={form.state}
                onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-sm font-medium text-gray-700">Notes</span>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                className="textarea"
              />
            </label>

            <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => router.push(`/customers/${customerId}`)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving || !form.name.trim()} className={primaryButtonClass}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  )
}
