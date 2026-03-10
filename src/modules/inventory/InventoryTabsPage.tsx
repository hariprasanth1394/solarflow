"use client"

import dynamic from "next/dynamic"
import { useState } from "react"

const SparePartsPage = dynamic(() => import("@/modules/inventory/spares/SparePartsPage"))
const SystemBuilderPage = dynamic(() => import("@/modules/inventory/systems/SystemBuilderPage"))
const SystemAvailabilityPage = dynamic(() => import("@/modules/inventory/availability/SystemAvailabilityPage"))
const InventoryDashboard = dynamic(() => import("@/modules/inventory/dashboard/InventoryDashboard"))

const tabs = [
  { key: "spares", label: "Spare Parts Management" },
  { key: "systems", label: "Solar System Builder" },
  { key: "availability", label: "System Inventory Availability" },
  { key: "dashboard", label: "Inventory Dashboard" }
] as const

type TabKey = (typeof tabs)[number]["key"]

export default function InventoryTabsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("spares")

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900">Inventory Management</h2>
        <p className="mt-1 text-sm text-gray-600">Manage spares, systems, availability and dashboard metrics.</p>
      </section>

      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg border px-3 py-2 text-xs transition sm:text-sm ${
                activeTab === tab.key
                  ? "border-violet-300 bg-violet-50 font-semibold text-violet-700"
                  : "border-gray-200 text-gray-600 hover:border-violet-200 hover:text-violet-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "spares" ? <SparePartsPage /> : null}
      {activeTab === "systems" ? <SystemBuilderPage /> : null}
      {activeTab === "availability" ? <SystemAvailabilityPage /> : null}
      {activeTab === "dashboard" ? <InventoryDashboard /> : null}
    </div>
  )
}
