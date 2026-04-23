import dynamic from "next/dynamic"
import { Suspense } from "react"

const InventoryTabsPage = dynamic(() => import("@/modules/inventory/InventoryTabsPage"))

export default function InventoryRoutePage() {
  return (
    <Suspense fallback={null}>
      <InventoryTabsPage />
    </Suspense>
  )
}
