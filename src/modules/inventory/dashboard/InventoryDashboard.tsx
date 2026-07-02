"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ChevronRight, Coins, Layers, Package } from "lucide-react"
import {
  getInventoryDashboardMetrics,
  getSystemAvailability,
} from "../../../services/inventoryService"
import { getSpares } from "../../../services/spareService"
import { formatDateUTC } from "../../../utils/dateFormat"
import InventoryPageShell from "../components/InventoryPageShell"
import InventoryStatCard from "../components/InventoryStatCard"
import OperationsHistoryTable from "../components/OperationsHistoryTable"

type DashboardMetrics = {
  totalSpareParts: number
  availableSystems: number
  reservedSystems: number
  lowStockItems: number
  totalSystems: number
}

type AvailabilityRow = {
  system_id: string
  system_name: string
  capacity_kw: number
  available_systems: number
}

const initialState: DashboardMetrics = {
  totalSpareParts: 0,
  availableSystems: 0,
  reservedSystems: 0,
  lowStockItems: 0,
  totalSystems: 0,
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

function buildTone(count: number) {
  if (count === 0) return "danger" as const
  if (count < 5) return "warning" as const
  return "success" as const
}

export default function InventoryDashboard() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialState)
  const [availability, setAvailability] = useState<AvailabilityRow[]>([])
  const [inventoryValue, setInventoryValue] = useState(0)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const [metricsRes, availabilityRes, sparesRes] = await Promise.all([
        getInventoryDashboardMetrics(),
        getSystemAvailability(),
        getSpares({ page: 1, pageSize: 100 }),
      ])

      if (metricsRes.data) setMetrics(metricsRes.data as DashboardMetrics)
      setAvailability((availabilityRes.data as AvailabilityRow[]) ?? [])

      const spares = (sparesRes.data ?? []) as Array<{ stock_quantity?: number; cost_price?: number }>
      setInventoryValue(
        spares.reduce((sum, spare) => sum + Number(spare.stock_quantity ?? 0) * Number(spare.cost_price ?? 0), 0)
      )
      setLoading(false)
    }
    void run()
  }, [])

  const buildCapabilityRows = useMemo(
    () => [...availability].sort((a, b) => b.available_systems - a.available_systems).slice(0, 5),
    [availability]
  )

  return (
    <InventoryPageShell contentOnly>
      <div className="inv-stat-grid">
        <InventoryStatCard label="Total SKUs" value={metrics.totalSpareParts} icon={Package} loading={loading} />
        <InventoryStatCard
          label="Low Stock"
          value={metrics.lowStockItems}
          icon={AlertTriangle}
          tone="warning"
          loading={loading}
        />
        <InventoryStatCard
          label="Inventory Value"
          value={formatCurrency(inventoryValue)}
          icon={Coins}
          tone="blue"
          loading={loading}
        />
        <InventoryStatCard
          label="System Library"
          value={metrics.totalSystems}
          icon={Layers}
          tone="accent"
          loading={loading}
        />
      </div>

      <div className="inv-dashboard-panels">
        <section className="inv-panel-card inv-elevated-card">
          <header className="inv-panel-card-header">
            <div>
              <h2 className="inv-section-title">Build capability</h2>
              <p className="inv-section-subtitle">Top systems you can deliver right now</p>
            </div>
            <Link href="/inventory?tab=availability" className="inv-link-action">
              See full availability
              <ChevronRight className="h-4 w-4" />
            </Link>
          </header>

          <div className="inv-build-list">
            {loading ? (
              <div className="inv-skeleton inv-skeleton--block" />
            ) : buildCapabilityRows.length === 0 ? (
              <p className="text-sm text-[var(--inv-secondary)]">No build data yet.</p>
            ) : (
              buildCapabilityRows.map((row) => {
                const tone = buildTone(row.available_systems)
                return (
                  <article key={row.system_id} className="inv-build-row">
                    <div className="inv-build-row-copy">
                      <p className="inv-build-row-title">{row.system_name}</p>
                      <p className="inv-build-row-meta">{row.capacity_kw} kW</p>
                      <div className="inv-progress inv-progress--sm">
                        <div
                          className={
                            row.available_systems === 0
                              ? "inv-progress-bar inv-progress-bar--danger"
                              : "inv-progress-bar"
                          }
                          style={{ width: `${Math.min(100, row.available_systems * 10)}%` }}
                        />
                      </div>
                    </div>
                    <span className={`inv-build-count inv-build-count--${tone}`}>
                      {row.available_systems} units
                    </span>
                  </article>
                )
              })
            )}
          </div>
        </section>

        <section className="inv-panel-card inv-elevated-card">
          <header className="inv-panel-card-header">
            <div>
              <h2 className="inv-section-title">Recent operations</h2>
              <p className="inv-section-subtitle">Last imports & exports</p>
            </div>
          </header>
          <OperationsHistoryTable compact />
        </section>
      </div>
    </InventoryPageShell>
  )
}
