"use client"

import { useEffect, useState } from "react"
import {
  getInventoryDashboardMetrics,
  getInventorySpareSummary,
  type InventorySpareSummaryRow
} from "../../../services/inventoryService"
import { formatDateUTC } from "../../../utils/dateFormat"

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

  return (
    <div className="space-y-4">
      {loading ? <p className="text-sm text-gray-500">Loading dashboard...</p> : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total spare parts</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{metrics.totalSpareParts}</p>
        </div>
        <div className="rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Available systems</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{metrics.availableSystems}</p>
        </div>
        <div className="rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Reserved systems</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{metrics.reservedSystems}</p>
        </div>
        <div className="rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Low stock items</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{metrics.lowStockItems}</p>
        </div>
      </div>

      <div className="rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-base font-semibold text-gray-900">Inventory Summary</h3>
        <div className="mt-4 hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-3 font-medium">Spare Name</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Available</th>
                <th className="px-3 py-3 font-medium">Reserved</th>
                <th className="px-3 py-3 font-medium">Consumed</th>
                <th className="px-3 py-3 font-medium">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    No inventory data found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-700">{row.spareName}</td>
                    <td className="px-3 py-3 text-gray-700">{row.category}</td>
                    <td className="px-3 py-3 text-gray-700">{row.available}</td>
                    <td className="px-3 py-3 text-gray-700">{row.reserved}</td>
                    <td className="px-3 py-3 text-gray-700">{row.consumed}</td>
                    <td className="px-3 py-3 text-gray-700">{formatDateUTC(row.lastUpdated)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 space-y-3 md:hidden">
          {rows.length === 0 ? <p className="text-sm text-gray-500">No inventory data found.</p> : null}
          {rows.map((row) => (
            <article key={row.id} className="rounded-xl border border-gray-100 p-4">
              <p className="text-sm font-medium text-gray-900">{row.spareName}</p>
              <p className="mt-1 text-xs text-gray-600">Category: {row.category}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-700">
                <span>Available: {row.available}</span>
                <span>Reserved: {row.reserved}</span>
                <span>Consumed: {row.consumed}</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">Updated: {formatDateUTC(row.lastUpdated)}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
