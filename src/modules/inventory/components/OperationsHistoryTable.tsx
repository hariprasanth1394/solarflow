"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { formatDateTimeUTC } from "@/utils/dateFormat"
import {
  inventoryTableCellClass,
  inventoryTableClass,
  inventoryTableHeaderCellClass,
  inventoryTableHeaderRowClass,
  inventoryTableRowClass,
  inventoryTableWrapperClass,
} from "./inventoryTableStyles"

type OperationRow = {
  batchId: string
  filename: string
  status: string
  uploadedAt: string
  uploadedBy: string
  totalRows: number
  successCount: number
  warningCount: number
  errorCount: number
}

function statusMeta(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes("complete") || normalized === "completed" || normalized === "success") {
    return { label: "Completed", tone: "success" as const, Icon: CheckCircle2 }
  }
  if (normalized.includes("fail")) {
    return { label: "Failed", tone: "danger" as const, Icon: XCircle }
  }
  if (normalized === "validated") {
    return { label: "Validated", tone: "warning" as const, Icon: AlertTriangle }
  }
  if (normalized.includes("warn") || normalized.includes("valid")) {
    return { label: "Warning", tone: "warning" as const, Icon: AlertTriangle }
  }
  return { label: status, tone: "muted" as const, Icon: AlertTriangle }
}

function outcomeMessage(row: OperationRow) {
  const normalized = row.status.toLowerCase()
  if (normalized.includes("complete") || normalized === "completed") {
    const applied = row.successCount > 0 ? row.successCount : row.totalRows
    return `${applied} row${applied === 1 ? "" : "s"} applied to inventory`
  }
  if (normalized.includes("fail")) {
    if (row.errorCount > 0) {
      return `Import failed · ${row.errorCount} error${row.errorCount === 1 ? "" : "s"}`
    }
    return "Import failed · check file and try again"
  }
  if (normalized === "validated") {
    return "File validated · awaiting confirmation"
  }
  if (row.warningCount > 0 || row.errorCount > 0) {
    return `${row.errorCount} error${row.errorCount === 1 ? "" : "s"}, ${row.warningCount} warning${row.warningCount === 1 ? "" : "s"}`
  }
  return `${row.totalRows} row${row.totalRows === 1 ? "" : "s"} processed`
}

type OperationsHistoryTableProps = {
  compact?: boolean
  refreshKey?: number
}

export default function OperationsHistoryTable({ compact = false, refreshKey = 0 }: OperationsHistoryTableProps) {
  const [rows, setRows] = useState<OperationRow[]>([])
  const [loading, setLoading] = useState(true)

  const loadRows = useCallback(async (active: { current: boolean }) => {
    setLoading(true)
    try {
      const response = await fetch("/api/inventory/import/logs?limit=8")
      const payload = await response.json().catch(() => null)
      if (!active.current) return
      if (!response.ok) {
        setRows([])
        return
      }
      const batches = payload?.data?.batches ?? []
      setRows(
        batches.map((batch: Record<string, unknown>) => ({
          batchId: String(batch.batchId ?? batch.id ?? ""),
          filename: String(batch.filename ?? batch.file_name ?? "—"),
          status: String(batch.status ?? batch.batch_status ?? "unknown"),
          uploadedAt: String(batch.uploadedAt ?? batch.created_at ?? ""),
          uploadedBy: String(batch.uploadedBy ?? "Unknown"),
          totalRows: Number(batch.totalRows ?? batch.total_rows ?? 0),
          successCount: Number(batch.successCount ?? batch.success_count ?? 0),
          warningCount: Number(batch.warningCount ?? batch.warning_count ?? 0),
          errorCount: Number(batch.errorCount ?? batch.error_count ?? 0),
        }))
      )
    } finally {
      if (active.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const active = { current: true }
    void loadRows(active)
    return () => {
      active.current = false
    }
  }, [loadRows, refreshKey])

  const latest = rows[0] ?? null
  const historyRows = rows.slice(1)
  const latestMeta = latest ? statusMeta(latest.status) : null

  const summary = useMemo(() => {
    let success = 0
    let warning = 0
    let failed = 0
    rows.forEach((row) => {
      const tone = statusMeta(row.status).tone
      if (tone === "success") success += 1
      else if (tone === "danger") failed += 1
      else warning += 1
    })
    return { success, warning, failed }
  }, [rows])

  return (
    <section className={compact ? "inv-operations-history inv-operations-history--compact" : "inv-operations-history"}>
      {!compact ? (
        <header className="inv-operations-history-header">
          <div>
            <h2 className="inv-section-title">Recent imports</h2>
            <p className="inv-section-subtitle">Latest upload status and prior activity</p>
          </div>
          {rows.length > 0 ? (
            <div className="inv-operations-summary">
              <span className="inv-operations-summary-item inv-operations-summary-item--success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {summary.success}
              </span>
              <span className="inv-operations-summary-item inv-operations-summary-item--warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                {summary.warning}
              </span>
              <span className="inv-operations-summary-item inv-operations-summary-item--danger">
                <XCircle className="h-3.5 w-3.5" />
                {summary.failed}
              </span>
            </div>
          ) : null}
        </header>
      ) : null}

      {loading ? (
        <div className="inv-skeleton inv-skeleton--block" />
      ) : !latest ? (
        <p className="inv-operations-empty">No imports yet.</p>
      ) : (
        <>
          {latestMeta ? (
            <article className={`inv-operations-latest inv-operations-latest--${latestMeta.tone}`}>
              <span className={`inv-operations-latest-icon inv-operations-latest-icon--${latestMeta.tone}`}>
                <latestMeta.Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="inv-operations-latest-copy">
                <p className="inv-operations-latest-label">Latest upload</p>
                <p className="inv-operations-latest-title">{latest.filename}</p>
                <p className="inv-operations-latest-outcome">{outcomeMessage(latest)}</p>
                <p className="inv-operations-latest-meta">
                  {latestMeta.label}
                  {latest.uploadedAt ? ` · ${formatDateTimeUTC(latest.uploadedAt)}` : ""}
                </p>
              </div>
            </article>
          ) : null}

          {compact ? (
            <div className="inv-operations-compact-list">
              {historyRows.slice(0, 4).map((row) => {
                const meta = statusMeta(row.status)
                const Icon = meta.Icon
                return (
                  <article key={row.batchId} className="inv-operations-compact-row">
                    <span className={`inv-operations-compact-icon inv-operations-compact-icon--${meta.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="inv-operations-compact-copy">
                      <p className="inv-operations-compact-title">{row.filename}</p>
                      <p className="inv-operations-compact-meta">{outcomeMessage(row)}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <>
              {historyRows.length > 0 ? (
                <>
                  <p className="inv-operations-prior-label">Previous uploads</p>
                  <div className={`hidden md:block ${inventoryTableWrapperClass}`}>
                    <div className="overflow-x-auto">
                      <table className={`${inventoryTableClass} inv-table-dense`}>
                        <thead>
                          <tr className={inventoryTableHeaderRowClass}>
                            <th className={inventoryTableHeaderCellClass}>File</th>
                            <th className={inventoryTableHeaderCellClass}>Status</th>
                            <th className={inventoryTableHeaderCellClass}>Outcome</th>
                            <th className={inventoryTableHeaderCellClass}>When</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyRows.map((row) => {
                            const meta = statusMeta(row.status)
                            const Icon = meta.Icon
                            return (
                              <tr key={row.batchId} className={`${inventoryTableRowClass} inv-table-row-interactive`}>
                                <td className={`${inventoryTableCellClass} font-medium`}>{row.filename}</td>
                                <td className={inventoryTableCellClass}>
                                  <span className={`inv-import-status inv-import-status--${meta.tone}`}>
                                    <Icon className="h-3.5 w-3.5" />
                                    {meta.label}
                                  </span>
                                </td>
                                <td className={`${inventoryTableCellClass} text-[var(--inv-secondary)]`}>
                                  {outcomeMessage(row)}
                                </td>
                                <td className={`${inventoryTableCellClass} text-[var(--inv-secondary)]`}>
                                  {row.uploadedAt ? formatDateTimeUTC(row.uploadedAt) : "—"}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-2 md:hidden">
                    {historyRows.map((row) => {
                      const meta = statusMeta(row.status)
                      return (
                        <article key={row.batchId} className="inv-mobile-data-card">
                          <div className="inv-mobile-data-card-head">
                            <p className="inv-mobile-data-card-title">{row.filename}</p>
                            <span className={`inv-import-status inv-import-status--${meta.tone}`}>{meta.label}</span>
                          </div>
                          <div className="inv-mobile-data-card-meta">
                            <span>{outcomeMessage(row)}</span>
                            <span>{row.uploadedAt ? formatDateTimeUTC(row.uploadedAt) : "—"}</span>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </>
              ) : null}
            </>
          )}
        </>
      )}
    </section>
  )
}
