"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowUpDown, SlidersHorizontal } from "lucide-react"
import SparePartsPage from "@/modules/inventory/spares/SparePartsPage"
import SystemBuilderPage from "@/modules/inventory/systems/SystemBuilderPage"
import SystemAvailabilityPage from "@/modules/inventory/availability/SystemAvailabilityPage"
import InventoryDashboard from "@/modules/inventory/dashboard/InventoryDashboard"
import InventoryImportExportPage from "@/modules/inventory/InventoryImportExportPage"
import { useAppTopBar } from "@/components/layout/AppTopBarContext"
import { inventoryPageContainerClass } from "@/modules/inventory/components/inventoryTableStyles"

const tabs = [
  {
    key: "dashboard",
    label: "Overview",
    description: "Key inventory insights and top stock risks."
  },
  {
    key: "spares",
    label: "Spares",
    description: "Track spare inventory."
  },
  {
    key: "systems",
    label: "Systems",
    description: "Define system configurations and map required components."
  },
  {
    key: "availability",
    label: "Availability",
    description: "Monitor buildable system count and shortage constraints."
  },
  {
    key: "import-export",
    label: "Import / Export",
    description: "Export templates and apply bulk stock updates safely."
  }
] as const

type TabKey = (typeof tabs)[number]["key"]

function isTabKey(value: string | null): value is TabKey {
  if (!value) return false
  return tabs.some((tab) => tab.key === value)
}

export default function InventoryTabsPage() {
  const searchParams = useSearchParams()
  const { setTopBarContent, clearTopBarContent } = useAppTopBar()
  const initialTab = (() => {
    const tabParam = searchParams.get('tab')
    return isTabKey(tabParam) ? tabParam : 'dashboard'
  })()

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [loadedTabs, setLoadedTabs] = useState<Record<TabKey, boolean>>(() => ({
    dashboard: initialTab === "dashboard",
    spares: initialTab === "spares",
    systems: initialTab === "systems",
    availability: initialTab === "availability",
    "import-export": initialTab === "import-export"
  }))

  const handleTabClick = (tabKey: TabKey) => {
    setActiveTab(tabKey)
    setLoadedTabs((previous) => {
      if (previous[tabKey]) return previous
      return {
        ...previous,
        [tabKey]: true
      }
    })
  }

  const renderTabPanel = (tabKey: TabKey) => {
    if (tabKey === "spares") return <SparePartsPage />
    if (tabKey === "systems") return <SystemBuilderPage />
    if (tabKey === "availability") return <SystemAvailabilityPage />
    if (tabKey === "dashboard") return <InventoryDashboard />
    return <InventoryImportExportPage />
  }

  const topNav = useMemo(
    () => (
      <div className="px-4 md:px-6">
        <div className="-mx-1 overflow-x-auto px-1 md:mx-0 md:px-0">
          <nav className="flex min-w-max items-center gap-5 py-1" aria-label="Inventory sections">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabClick(tab.key)}
                className={`group relative h-10 whitespace-nowrap px-1 text-[13px] uppercase tracking-[0.06em] transition-all duration-200 ${
                  activeTab === tab.key
                    ? "font-bold text-blue-700"
                    : "font-semibold text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
                <span
                  className={`absolute -bottom-0.5 left-0 h-1 w-full rounded-full bg-gradient-to-r from-blue-600 to-violet-600 shadow-[0_0_0_1px_rgba(37,99,235,0.12)] transition-transform duration-200 ease-out ${
                    activeTab === tab.key ? "scale-x-100" : "scale-x-0"
                  } origin-left`}
                />
              </button>
            ))}
            <div className="ml-3 flex items-center gap-2 md:hidden">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                <SlidersHorizontal className="h-4 w-4" />
              </span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                <ArrowUpDown className="h-4 w-4" />
              </span>
            </div>
          </nav>
        </div>
      </div>
    ),
    [activeTab]
  )

  useEffect(() => {
    setTopBarContent(topNav)
    return () => {
      clearTopBarContent()
    }
  }, [clearTopBarContent, setTopBarContent, topNav])

  return (
    <div className={`inventory-module ${inventoryPageContainerClass}`}>
      <section className="min-h-[420px]">
        {tabs.map((tab) => {
          if (!loadedTabs[tab.key]) return null

          const isActive = activeTab === tab.key
          return (
            <div key={tab.key} className={isActive ? "block" : "hidden"} aria-hidden={!isActive}>
              {renderTabPanel(tab.key)}
            </div>
          )
        })}
      </section>
    </div>
  )
}
