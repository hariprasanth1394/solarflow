"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowDownUp, BarChart3, Boxes, Package, Zap } from "lucide-react"
import SparePartsPage from "@/modules/inventory/spares/SparePartsPage"
import SystemBuilderPage from "@/modules/inventory/systems/SystemBuilderPage"
import SystemAvailabilityPage from "@/modules/inventory/availability/SystemAvailabilityPage"
import InventoryDashboard from "@/modules/inventory/dashboard/InventoryDashboard"
import InventoryImportExportPage from "@/modules/inventory/InventoryImportExportPage"
import InventoryModuleHeader from "@/modules/inventory/components/InventoryModuleHeader"
import InventorySubNav from "@/modules/inventory/components/InventorySubNav"

const tabs = [
  { key: "dashboard", label: "Overview", icon: BarChart3 },
  { key: "spares", label: "Spares", icon: Package },
  { key: "systems", label: "Systems", icon: Zap },
  { key: "availability", label: "Availability", icon: Boxes },
  { key: "import-export", label: "Import / Export", icon: ArrowDownUp },
] as const

type TabKey = (typeof tabs)[number]["key"]

function isTabKey(value: string | null): value is TabKey {
  if (!value) return false
  return tabs.some((tab) => tab.key === value)
}

export default function InventoryTabsPage() {
  const searchParams = useSearchParams()
  const initialTab = (() => {
    const tabParam = searchParams.get("tab")
    return isTabKey(tabParam) ? tabParam : "dashboard"
  })()

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [loadedTabs, setLoadedTabs] = useState<Record<TabKey, boolean>>(() => ({
    dashboard: initialTab === "dashboard",
    spares: initialTab === "spares",
    systems: initialTab === "systems",
    availability: initialTab === "availability",
    "import-export": initialTab === "import-export",
  }))

  const handleTabClick = (tabKey: TabKey) => {
    setActiveTab(tabKey)
    setLoadedTabs((previous) => {
      if (previous[tabKey]) return previous
      return { ...previous, [tabKey]: true }
    })
  }

  useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (!isTabKey(tabParam)) return

    setActiveTab(tabParam)
    setLoadedTabs((previous) => {
      if (previous[tabParam]) return previous
      return { ...previous, [tabParam]: true }
    })
  }, [searchParams])

  const renderTabPanel = (tabKey: TabKey) => {
    if (tabKey === "spares") return <SparePartsPage />
    if (tabKey === "systems") return <SystemBuilderPage />
    if (tabKey === "availability") return <SystemAvailabilityPage />
    if (tabKey === "dashboard") return <InventoryDashboard />
    return <InventoryImportExportPage />
  }

  return (
    <div className="inventory-module inv-module-shell">
      <InventoryModuleHeader />
      <InventorySubNav tabs={[...tabs]} activeKey={activeTab} onTabClick={(key) => handleTabClick(key as TabKey)} />
      <section className="inv-tab-content min-h-[420px]">
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
