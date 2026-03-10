import dynamic from "next/dynamic"

const InventoryTabsPage = dynamic(() => import("@/modules/inventory/InventoryTabsPage"))

export default function InventoryRoutePage() {
  return <InventoryTabsPage />
}
