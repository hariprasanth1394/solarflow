"use client"

import { useEffect, useState } from "react"
import DataTable from "../../../components/tables/DataTable"
import { getSystemAvailability } from "../../../services/inventoryService"

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

  const columns = [
    { key: "system_name", header: "System Name" },
    {
      key: "capacity_kw",
      header: "Capacity kW",
      render: (row: AvailabilityRow) => <span>{row.capacity_kw}</span>
    },
    {
      key: "available_systems",
      header: "Available Systems",
      render: (row: AvailabilityRow) => <span className="font-semibold text-gray-900">{row.available_systems}</span>
    }
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      loading={loading}
      totalCount={rows.length}
      page={1}
      pageSize={rows.length || 1}
      onPageChange={() => {}}
    />
  )
}
