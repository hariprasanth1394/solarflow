"use client"

import dynamic from "next/dynamic"
import ModulePageHeader from "@/components/layout/ModulePageHeader"
import { Warehouse } from "lucide-react"

const InventoryImportExportPage = dynamic(() => import("@/modules/inventory/InventoryImportExportPage"))

export default function InventoryImportExportRoute() {
  return (
    <div className="inventory-module inv-module-shell">
      <ModulePageHeader title="Inventory" icon={Warehouse} className="inv-module-header" />
      <InventoryImportExportPage />
    </div>
  )
}
