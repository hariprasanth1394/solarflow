"use client"

import { useEffect, useState } from "react"
import DataTable from "../../../components/tables/DataTable"
import { getSystemAvailability } from "../../../services/inventoryService"
import InventoryPageShell from "../components/InventoryPageShell"
import { inventorySectionCardClass } from "../components/inventoryTableStyles"

type AvailabilityRow = {
  system_id: string
  system_name: string
  capacity_kw: number
  available_systems: number
}

export default function SystemAvailabilityPage() {
  const [rows, setRows] = useState<AvailabilityRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const { data } = await getSystemAvailability()
      setRows((data as AvailabilityRow[]) ?? [])
      setLoading(false)
    }
    void run()
  }, [])

  const statusMeta = (count: number) => {
    if (count >= 5) return { label: "Healthy", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" }
    if (count >= 1) return { label: "Limited", tone: "text-amber-700 bg-amber-50 border-amber-200" }
    return { label: "Blocked", tone: "text-rose-700 bg-rose-50 border-rose-200" }
  }

  const healthyCount = rows.filter((row) => row.available_systems >= 5).length
  const limitedCount = rows.filter((row) => row.available_systems > 0 && row.available_systems < 5).length
  const blockedCount = rows.filter((row) => row.available_systems === 0).length

  const columns = [
    { key: "system_name", header: "System Name" },
    {
      key: "capacity_kw",
      header: "Capacity kW",
      render: (row: AvailabilityRow) => <span>{row.capacity_kw}</span>
    },
    {
      key: "status",
      header: "Status",
      render: (row: AvailabilityRow) => {
        const meta = statusMeta(row.available_systems)
        return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${meta.tone}`}>{meta.label}</span>
      }
    },
    {
      key: "available_systems",
      header: "Available Systems",
      render: (row: AvailabilityRow) => <span className="font-semibold text-slate-900">{row.available_systems}</span>
    }
  ]

  return (
    <InventoryPageShell
      title="Availability"
      subtitle="Track which system configurations are healthy, constrained, or currently blocked by stock shortages."
    >
      <div className={`${inventorySectionCardClass} flex flex-wrap items-center gap-2 text-sm`}>
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Healthy: {healthyCount}</span>
        <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-amber-700">Limited: {limitedCount}</span>
        <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-rose-700">Blocked: {blockedCount}</span>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        totalCount={rows.length}
        page={1}
        pageSize={rows.length || 1}
        onPageChange={() => {}}
        emptyLabel="No system availability data found"
        enableSearch={false}
      />
    </InventoryPageShell>
  )
}
