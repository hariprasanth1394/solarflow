"use client"

import { ArrowRight } from "lucide-react"
import {
  inventoryTableCellClass,
  inventoryTableClass,
  inventoryTableHeaderCellClass,
  inventoryTableHeaderRowClass,
  inventoryTableRowClass,
  inventoryTableWrapperClass,
} from "./inventoryTableStyles"
import InventoryTablePager from "./InventoryTablePager"

type PreviewRow = {
  rowNumber: number
  spareCode: string
  itemName: string
  category: string
  unit: string
  currentStock: number
  importedStock: number
  difference: number
  status: "NEW" | "UPDATE" | "NO CHANGE" | "ERROR"
  errors: Array<{ column: string; message: string }>
  warnings: Array<{ column: string; message: string }>
  matchFound: boolean
  adjustmentReason?: string | null
}

type PreviewTableProps = {
  rows: PreviewRow[]
  showOnlyChanged: boolean
  onToggleShowOnlyChanged: (next: boolean) => void
  page: number
  pageSize: number
  totalCount: number
  changedCount: number
  allCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onUpdateImportedStock: (rowNumber: number, value: string) => void
  onUpdateAdjustmentReason?: (rowNumber: number, value: string) => void
}

const ADJUSTMENT_REASONS = [
  "Physical Count",
  "Damage/Loss",
  "Inventory Reconciliation",
  "Supplier Return",
  "Stock Adjustment",
  "System Error Correction",
  "Other"
]

function getDifferenceTone(difference: number) {
  if (difference > 0) return "inv-import-diff--up"
  if (difference < 0) return "inv-import-diff--down"
  return "inv-import-diff--neutral"
}

function StatusBadge({ row }: { row: PreviewRow }) {
  if (row.status === "ERROR") {
    return <span className="inv-import-status inv-import-status--danger"><span className="inv-import-status-dot" />Error</span>
  }
  if (row.status === "NEW") {
    return <span className="inv-import-status inv-import-status--info"><span className="inv-import-status-dot" />New</span>
  }
  if (row.status === "UPDATE") {
    return <span className="inv-import-status inv-import-status--success"><span className="inv-import-status-dot" />Update</span>
  }
  return <span className="inv-import-status inv-import-status--muted"><span className="inv-import-status-dot" />No change</span>
}

function StockChangeFields({
  row,
  onUpdateImportedStock,
  onUpdateAdjustmentReason
}: {
  row: PreviewRow
  onUpdateImportedStock: (rowNumber: number, value: string) => void
  onUpdateAdjustmentReason?: (rowNumber: number, value: string) => void
}) {
  const isError = row.status === "ERROR"
  const showReason = row.status === "UPDATE" || row.status === "NEW"

  return (
    <div className="inv-import-preview-stock-grid">
      <div className="inv-import-preview-stock-field">
        <span className="inv-import-preview-field-label">Current</span>
        <span className="inv-import-preview-field-value">{row.currentStock}</span>
      </div>
      <div className="inv-import-preview-stock-arrow" aria-hidden="true">
        <ArrowRight className="h-4 w-4" />
      </div>
      <div className="inv-import-preview-stock-field">
        <label className="inv-import-preview-field-label" htmlFor={`final-stock-${row.rowNumber}`}>
          Final stock
        </label>
        <input
          id={`final-stock-${row.rowNumber}`}
          type="number"
          value={row.importedStock}
          onChange={(event) => onUpdateImportedStock(row.rowNumber, event.target.value)}
          className="input inv-import-preview-stock-input"
          disabled={isError}
        />
      </div>
      <div className={`inv-import-diff ${getDifferenceTone(row.difference)}`}>
        <span className="inv-import-diff-value">
          {row.difference > 0 ? "+" : ""}
          {row.difference}
        </span>
        <span className="inv-import-diff-label">
          {row.difference > 0 ? "Increase" : row.difference < 0 ? "Decrease" : "No change"}
        </span>
      </div>
      {showReason ? (
        <div className="inv-import-preview-reason">
          <label className="inv-import-preview-field-label" htmlFor={`reason-${row.rowNumber}`}>
            Reason (optional)
          </label>
          <select
            id={`reason-${row.rowNumber}`}
            value={row.adjustmentReason || ""}
            onChange={(event) => onUpdateAdjustmentReason?.(row.rowNumber, event.target.value)}
            className="dropdown inv-import-preview-reason-select"
            disabled={isError}
          >
            <option value="">Select reason</option>
            {ADJUSTMENT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  )
}

export default function PreviewTable({
  rows,
  showOnlyChanged,
  onToggleShowOnlyChanged,
  page,
  pageSize,
  totalCount,
  changedCount,
  allCount,
  onPageChange,
  onPageSizeChange,
  onUpdateImportedStock,
  onUpdateAdjustmentReason
}: PreviewTableProps) {
  return (
    <div className="inv-import-preview">
      <div className="inv-import-preview-toolbar">
        <div className="inv-import-preview-filter" role="tablist" aria-label="Row filter">
          <button
            type="button"
            role="tab"
            aria-selected={showOnlyChanged}
            className={`inv-import-preview-filter-btn ${showOnlyChanged ? "inv-import-preview-filter-btn--active" : ""}`}
            onClick={() => onToggleShowOnlyChanged(true)}
          >
            <span>Changed</span>
            <span className="inv-import-preview-filter-count">{changedCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!showOnlyChanged}
            className={`inv-import-preview-filter-btn ${!showOnlyChanged ? "inv-import-preview-filter-btn--active" : ""}`}
            onClick={() => onToggleShowOnlyChanged(false)}
          >
            <span>All rows</span>
            <span className="inv-import-preview-filter-count">{allCount}</span>
          </button>
        </div>
        <p className="inv-import-preview-count">
          Showing {totalCount} row{totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="inv-import-preview-mobile">
        {rows.length === 0 ? (
          <div className="inv-import-preview-empty">No rows match the current filter.</div>
        ) : (
          rows.map((row) => (
            <article
              key={row.rowNumber}
              className={`inv-import-preview-card inv-import-preview-card--${row.status.toLowerCase().replace(" ", "-")}`}
            >
              <div className="inv-import-preview-card-head">
                <div className="min-w-0">
                  <p className="inv-import-preview-code">{row.spareCode || "New spare"}</p>
                  <p className="inv-import-preview-name">{row.itemName}</p>
                  <p className="inv-import-preview-meta">
                    {row.category}
                    {row.unit ? ` · ${row.unit}` : ""}
                  </p>
                </div>
                <StatusBadge row={row} />
              </div>

              {row.status === "ERROR" && row.errors.length > 0 ? (
                <p className="inv-import-preview-error">
                  {row.errors[0]?.column}: {row.errors[0]?.message}
                </p>
              ) : (
                <StockChangeFields
                  row={row}
                  onUpdateImportedStock={onUpdateImportedStock}
                  onUpdateAdjustmentReason={onUpdateAdjustmentReason}
                />
              )}
            </article>
          ))
        )}
      </div>

      <div className={`${inventoryTableWrapperClass} inv-import-preview-desktop`}>
        <div className="overflow-x-auto">
          <table className={inventoryTableClass}>
            <thead>
              <tr className={inventoryTableHeaderRowClass}>
                <th className={`${inventoryTableHeaderCellClass} text-left`}>Spare</th>
                <th className={`${inventoryTableHeaderCellClass} text-right`}>Current</th>
                <th className={`${inventoryTableHeaderCellClass} text-right`}>Final</th>
                <th className={`${inventoryTableHeaderCellClass} text-center`}>Change</th>
                <th className={`${inventoryTableHeaderCellClass} text-left`}>Reason</th>
                <th className={`${inventoryTableHeaderCellClass} text-left`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isError = row.status === "ERROR"
                const showReason = row.status === "UPDATE" || row.status === "NEW"

                return (
                  <tr key={row.rowNumber} className={inventoryTableRowClass}>
                    <td className={inventoryTableCellClass}>
                      <p className="inv-import-preview-code">{row.spareCode || "Auto-generate"}</p>
                      <p className="mt-0.5 text-sm inv-import-preview-name">{row.itemName}</p>
                      <p className="mt-0.5 text-xs inv-import-preview-meta">
                        {row.category}
                        {row.unit ? ` · ${row.unit}` : ""}
                      </p>
                    </td>
                    <td className={`${inventoryTableCellClass} text-right tabular-nums`}>
                      {row.currentStock}
                    </td>
                    <td className={`${inventoryTableCellClass} text-right`}>
                      <input
                        type="number"
                        value={row.importedStock}
                        onChange={(event) => onUpdateImportedStock(row.rowNumber, event.target.value)}
                        className="input ml-auto h-10 w-24 text-right font-mono"
                        disabled={isError}
                        aria-label={`Final stock for ${row.itemName}`}
                      />
                    </td>
                    <td className={`${inventoryTableCellClass} text-center`}>
                      <div className={`inv-import-diff inv-import-diff--inline ${getDifferenceTone(row.difference)}`}>
                        <span className="inv-import-diff-value">
                          {row.difference > 0 ? "+" : ""}
                          {row.difference}
                        </span>
                      </div>
                    </td>
                    <td className={inventoryTableCellClass}>
                      {showReason ? (
                        <select
                          value={row.adjustmentReason || ""}
                          onChange={(event) => onUpdateAdjustmentReason?.(row.rowNumber, event.target.value)}
                          className="dropdown h-10 w-full max-w-[220px] text-sm"
                          disabled={isError}
                          aria-label={`Adjustment reason for ${row.itemName}`}
                        >
                          <option value="">Optional</option>
                          {ADJUSTMENT_REASONS.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm inv-import-preview-meta">—</span>
                      )}
                    </td>
                    <td className={inventoryTableCellClass}>
                      {isError && row.errors.length > 0 ? (
                        <div className="space-y-1">
                          <StatusBadge row={row} />
                          <p className="text-xs text-rose-600">
                            {row.errors[0]?.column}: {row.errors[0]?.message}
                          </p>
                        </div>
                      ) : (
                        <StatusBadge row={row} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <InventoryTablePager
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        itemLabel="rows"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  )
}
