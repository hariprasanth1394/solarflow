import ModulePageHeader from "@/components/layout/ModulePageHeader"
import { Warehouse } from "lucide-react"

export default function InventoryModuleHeader() {
  return <ModulePageHeader title="Inventory" icon={Warehouse} className="inv-module-header" />
}
