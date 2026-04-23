"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getOrganizationSettings, updateOrganizationSettings } from "../../services/settingsService"
import { supabase } from "@/lib/supabaseClient"

type SettingsForm = {
  company_name: string
  logo_url: string
  timezone: string
  currency: string
}

const defaultForm: SettingsForm = {
  company_name: "",
  logo_url: "",
  timezone: "Asia/Kolkata",
  currency: "INR"
}

export default function SettingsPage() {
  const router = useRouter()
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [form, setForm] = useState<SettingsForm>(defaultForm)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState("")

  useEffect(() => {
    let active = true

    void (async () => {
      const { data } = await getOrganizationSettings()
      if (!active || !data) return

      setSettingsId(data.id)
      setForm({
        company_name: data.company_name ?? "",
        logo_url: data.logo_url ?? "",
        timezone: data.timezone ?? "Asia/Kolkata",
        currency: data.currency ?? "INR"
      })
    })()

    void (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser()
        const userId = authData?.user?.id

        if (!active || !userId) {
          setCheckingRole(false)
          return
        }

        const { data: userRow } = await supabase
          .from("users")
          .select("role")
          .eq("id", userId)
          .limit(1)
          .maybeSingle()

        if (!active) return

        setIsAdmin(userRow?.role === "admin")
      } finally {
        if (active) setCheckingRole(false)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    const { error } = await updateOrganizationSettings(form, settingsId)
    setLoading(false)
    setMessage(error ? error.message : "Settings saved successfully")
  }

  const handleResetInventoryTestData = async () => {
    const confirmed = window.confirm(
      "This will delete and reseed inventory test data for your organization. Continue?"
    )

    if (!confirmed) return

    setResetLoading(true)
    setResetMessage("")

    try {
      const response = await fetch("/api/admin/reset-inventory-test-data", {
        method: "POST"
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setResetMessage(payload?.error?.message || "Failed to reset inventory test data")
        return
      }

      setResetMessage("Inventory test data reset completed successfully. Refreshing data...")
      router.refresh()
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch {
      setResetMessage("Failed to reset inventory test data")
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
        <p className="mt-1 text-sm text-gray-600">Manage organization profile and preferences.</p>
      </section>

      <form onSubmit={saveSettings} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Company Name</label>
            <input
              value={form.company_name}
              onChange={(event) => setForm((prev) => ({ ...prev, company_name: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Logo URL</label>
            <input
              value={form.logo_url}
              onChange={(event) => setForm((prev) => ({ ...prev, logo_url: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Timezone</label>
            <input
              value={form.timezone}
              onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
            <input
              value={form.currency}
              onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}

        <button type="submit" disabled={loading} className="mt-5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white">
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </form>

      {!checkingRole && isAdmin && (
        <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Danger Zone</h3>
          <p className="mt-1 text-sm text-gray-600">
            Reset and reseed inventory test data for this organization (staging/demo use only).
          </p>

          {resetMessage && <p className="mt-3 text-sm text-gray-600">{resetMessage}</p>}

          <button
            type="button"
            onClick={handleResetInventoryTestData}
            disabled={resetLoading}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {resetLoading ? "Resetting..." : "Reset Inventory Test Data"}
          </button>
        </section>
      )}
    </div>
  )
}
