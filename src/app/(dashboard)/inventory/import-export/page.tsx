import dynamic from 'next/dynamic'

const InventoryImportExportPage = dynamic(() => import('@/modules/inventory/InventoryImportExportPage'))

export default function InventoryImportExportRoute() {
  return <InventoryImportExportPage />
}
