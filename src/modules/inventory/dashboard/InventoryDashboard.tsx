"use client"

import { useEffect, useState } from "react"
import {
  getInventoryDashboardMetrics,
  getInventorySpareSummary,
  type InventorySpareSummaryRow
} from "../../../services/inventoryService"
import { formatDateUTC } from "../../../utils/dateFormat"
import InventoryPageShell from "../components/InventoryPageShell"
import {
  inventorySectionCardClass,
  inventoryTableCellClass,
  inventoryTableClass,
  inventoryTableHeaderCellClass,
  inventoryTableHeaderRowClass,
  inventoryTableRowClass,
  inventoryTableWrapperClass,
} from "../components/inventoryTableStyles"

type DashboardMetrics = {
  totalSpareParts: number
  availableSystems: number
  reservedSystems: number
  lowStockItems: number
}

const initialState: DashboardMetrics = {
  totalSpareParts: 0,
  availableSystems: 0,
  reservedSystems: 0,
  lowStockItems: 0,
}

export default function InventoryDashboard() {
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialState)
  const [rows, setRows] = useState<InventorySpareSummaryRow[]>([])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const [metricsRes, summaryRes] = await Promise.all([getInventoryDashboardMetrics(), getInventorySpareSummary()])

      if (metricsRes.data) {
        setMetrics(metricsRes.data as DashboardMetrics)
      }

      setRows((summaryRes.data ?? []) as InventorySpareSummaryRow[])
      setLoading(false)
    }
    void run()
  }, [])

  const lowCoverageRows = [...rows]
    .sort((a, b) => a.available - b.available)
    .slice(0, 8)

  const riskRate = metrics.totalSpareParts > 0
    ? Math.round((metrics.lowStockItems / metrics.totalSpareParts) * 100)
    : 0

  return (
    <InventoryPageShell
      title="Overview"
      subtitle="Monitor inventory health, buildable systems, and the spare parts most likely to block upcoming work."
    >
      {loading ? <p className="text-sm text-slate-500">Loading dashboard...</p> : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className={`${inventorySectionCardClass} flex min-h-[112px] flex-col justify-between`}>
          <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-slate-500">Total spare parts</p>
          <p className="text-[28px] font-semibold leading-[1.2] text-slate-900">{metrics.totalSpareParts}</p>
        </div>
        <div className={`${inventorySectionCardClass} flex min-h-[112px] flex-col justify-between`}>
          <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-slate-500">Buildable systems</p>
          <p className="text-[28px] font-semibold leading-[1.2] text-slate-900">{metrics.availableSystems}</p>
        </div>
        <div className={`${inventorySectionCardClass} flex min-h-[112px] flex-col justify-between`}>
          <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-slate-500">Low-stock items</p>
          <p className="text-[28px] font-semibold leading-[1.2] text-slate-900">{metrics.lowStockItems}</p>
        </div>
        <div className={`${inventorySectionCardClass} flex min-h-[112px] flex-col justify-between`}>
          <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-slate-500">Low-stock risk</p>
          <div>
            <p className="text-[28px] font-semibold leading-[1.2] text-slate-900">{riskRate}%</p>
            <p className="mt-1 text-[12px] text-slate-500">Reserved systems: {metrics.reservedSystems}</p>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-slate-900">Priority insights</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Spares with the lowest available quantities appear first.</p>
        </div>

        <div className={`hidden md:block ${inventoryTableWrapperClass}`}>
          <div className="overflow-x-auto">
            <table className={`${inventoryTableClass} text-left`}>
              <thead>
                <tr className={inventoryTableHeaderRowClass}>
                  <th className={inventoryTableHeaderCellClass}>Spare Name</th>
                  <th className={inventoryTableHeaderCellClass}>Category</th>
                  <th className={`${inventoryTableHeaderCellClass} text-right`}>Available</th>
                  <th className={`${inventoryTableHeaderCellClass} text-right`}>Reserved</th>
                  <th className={`${inventoryTableHeaderCellClass} text-right`}>Consumed</th>
                  <th className={inventoryTableHeaderCellClass}>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {lowCoverageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      No inventory data found.
                    </td>
                  </tr>
                ) : (
                  lowCoverageRows.map((row) => (
                    <tr key={row.id} className={inventoryTableRowClass}>
                      <td className={`${inventoryTableCellClass} font-medium text-slate-900`}>{row.spareName}</td>
                      <td className={inventoryTableCellClass}>{row.category}</td>
                      <td className={`${inventoryTableCellClass} text-right tabular-nums`}>{row.available}</td>
                      <td className={`${inventoryTableCellClass} text-right tabular-nums`}>{row.reserved}</td>
                      <td className={`${inventoryTableCellClass} text-right tabular-nums`}>{row.consumed}</td>
                      <td className={inventoryTableCellClass}>{formatDateUTC(row.lastUpdated)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {lowCoverageRows.length === 0 ? <p className="text-sm text-slate-500">No inventory data found.</p> : null}
          {lowCoverageRows.map((row) => (
            <article key={row.id} className={inventorySectionCardClass}>
              <p className="text-sm font-medium text-slate-900">{row.spareName}</p>
              <p className="mt-1 text-xs text-slate-600">Category: {row.category}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-700">
                <span>Available: {row.available}</span>
                <span>Reserved: {row.reserved}</span>
                <span>Consumed: {row.consumed}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Updated: {formatDateUTC(row.lastUpdated)}</p>
            </article>
          ))}
        </div>
      </section>
    </InventoryPageShell>
  )
}
