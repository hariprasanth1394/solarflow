"use client"

import { useEffect, useState } from "react"
import { getOrganizationSettings, updateOrganizationSettings } from "../../services/settingsService"

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
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [form, setForm] = useState<SettingsForm>(defaultForm)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

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
    </div>
  )
}
