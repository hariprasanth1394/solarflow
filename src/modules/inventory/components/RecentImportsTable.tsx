"use client"

import { useEffect, useState } from "react"
import { formatDateTimeUTC } from "@/utils/dateFormat"
import { inventoryTableCellClass, inventoryTableClass, inventoryTableHeaderCellClass, inventoryTableHeaderRowClass, inventoryTableRowClass, inventoryTableWrapperClass } from "./inventoryTableStyles"

type ImportLogRow = {
  batchId: string
  filename: string
  status: string
  uploadedAt: string
  totalRows: number
  successCount: number
}

function statusClass(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes("complete") || normalized === "completed") return "inv-import-status--success"
  if (normalized.includes("fail")) return "inv-import-status--danger"
  if (normalized.includes("process")) return "inv-import-status--info"
  return "inv-import-status--muted"
}

export default function RecentImportsTable() {
  const [rows, setRows] = useState<ImportLogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetch("/api/inventory/import/logs?limit=8")
        const payload = await response.json().catch(() => null)
        if (!active) return
        if (!response.ok) {
          setRows([])
          return
        }
        const batches = payload?.data?.batches ?? payload?.batches ?? []
        setRows(
          batches.map((batch: Record<string, unknown>) => ({
            batchId: String(batch.batchId ?? batch.id ?? ""),
            filename: String(batch.filename ?? batch.file_name ?? "—"),
            status: String(batch.status ?? batch.batch_status ?? "unknown"),
            uploadedAt: String(batch.uploadedAt ?? batch.created_at ?? ""),
            totalRows: Number(batch.totalRows ?? batch.total_rows ?? 0),
            successCount: Number(batch.successCount ?? batch.success_count ?? 0),
          }))
        )
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="inv-recent-imports">
        <div className="inv-skeleton inv-skeleton--block" />
      </div>
    )
  }

  return (
    <section className="inv-recent-imports">
      <header className="inv-section-header">
        <h2 className="inv-section-title">Recent Imports</h2>
        <p className="inv-section-subtitle">Track recent bulk uploads and their outcomes.</p>
      </header>

      <div className={`hidden md:block ${inventoryTableWrapperClass}`}>
        <div className="overflow-x-auto">
          <table className={inventoryTableClass}>
            <thead>
              <tr className={inventoryTableHeaderRowClass}>
                <th className={inventoryTableHeaderCellClass}>Date</th>
                <th className={inventoryTableHeaderCellClass}>File Name</th>
                <th className={`${inventoryTableHeaderCellClass} text-right`}>Records</th>
                <th className={inventoryTableHeaderCellClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`${inventoryTableCellClass} text-center text-[var(--inv-secondary)]`}>
                    No import history yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.batchId} className={inventoryTableRowClass}>
                    <td className={inventoryTableCellClass}>{row.uploadedAt ? formatDateTimeUTC(row.uploadedAt) : "—"}</td>
                    <td className={`${inventoryTableCellClass} font-medium`}>{row.filename}</td>
                    <td className={`${inventoryTableCellClass} text-right tabular-nums`}>{row.totalRows}</td>
                    <td className={inventoryTableCellClass}>
                      <span className={`inv-import-status ${statusClass(row.status)}`}>{row.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--inv-secondary)]">No import history yet.</p>
        ) : (
          rows.map((row) => (
            <article key={row.batchId} className="inv-mobile-data-card">
              <div className="inv-mobile-data-card-head">
                <p className="inv-mobile-data-card-title">{row.filename}</p>
                <span className={`inv-import-status ${statusClass(row.status)}`}>{row.status}</span>
              </div>
              <div className="inv-mobile-data-card-meta">
                <span>{row.uploadedAt ? formatDateTimeUTC(row.uploadedAt) : "—"}</span>
                <span>{row.totalRows} records</span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
