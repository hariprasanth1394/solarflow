'use client'

import {
  inventoryTableCellClass,
  inventoryTableClass,
  inventoryTableHeaderCellClass,
  inventoryTableHeaderRowClass,
  inventoryPagerButtonClass,
  inventoryTableRowClass,
  inventoryTableWrapperClass,
} from './inventoryTableStyles'

type PreviewRow = {
  rowNumber: number
  spareCode: string
  itemName: string
  category: string
  unit: string
  currentStock: number
  importedStock: number
  difference: number
  status: 'NEW' | 'UPDATE' | 'NO CHANGE' | 'ERROR'
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
  totalPages: number
  onPrevPage: () => void
  onNextPage: () => void
  onUpdateImportedStock: (index: number, value: string) => void
  onUpdateAdjustmentReason?: (index: number, value: string) => void
}

const ADJUSTMENT_REASONS = [
  'Physical Count',
  'Damage/Loss',
  'Inventory Reconciliation',
  'Supplier Return',
  'Stock Adjustment',
  'System Error Correction',
  'Other'
]

function getDifferenceColor(difference: number): string {
  if (difference > 0) return 'text-emerald-700'
  if (difference < 0) return 'text-rose-700'
  return 'text-slate-500'
}

function getDifferenceBgColor(difference: number): string {
  if (difference > 0) return 'bg-emerald-50'
  if (difference < 0) return 'bg-rose-50'
  return 'bg-slate-50'
}

function getStatusLabel(difference: number): string {
  if (difference > 0) return 'Stock Increased'
  if (difference < 0) return 'Stock Reduced'
  return 'No Change'
}

export default function PreviewTable({
  rows,
  showOnlyChanged,
  onToggleShowOnlyChanged,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
  onUpdateImportedStock,
  onUpdateAdjustmentReason
}: PreviewTableProps) {
  const filteredRows = showOnlyChanged 
    ? rows.filter(row => row.status === 'UPDATE' || row.status === 'NEW')
    : rows

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showOnlyChanged}
            onChange={(event) => onToggleShowOnlyChanged(event.target.checked)}
          />
          Show only changed rows
        </label>
        <p className="text-xs text-slate-500">Page {page} / {totalPages}</p>
      </div>

      <div className={inventoryTableWrapperClass}>
        <div className="overflow-x-auto">
          <table className={inventoryTableClass}>
            <thead>
              <tr className={inventoryTableHeaderRowClass}>
                <th className={`${inventoryTableHeaderCellClass} text-left`}>Spare Code</th>
                <th className={`${inventoryTableHeaderCellClass} text-left`}>Item Name</th>
                <th className={`${inventoryTableHeaderCellClass} text-left`}>Category</th>
                <th className={`${inventoryTableHeaderCellClass} text-center`}>Unit</th>
                <th className={`${inventoryTableHeaderCellClass} text-right`}>Current Stock</th>
                <th className={`${inventoryTableHeaderCellClass} text-right`}>Final Stock</th>
                <th className={`${inventoryTableHeaderCellClass} text-center`}>Difference</th>
                <th className={`${inventoryTableHeaderCellClass} text-left`}>Adjustment Reason</th>
                <th className={`${inventoryTableHeaderCellClass} text-left`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => {
                const isError = row.status === 'ERROR'
                const isNew = row.status === 'NEW'
                const isUpdate = row.status === 'UPDATE'
                const rowStatusClass = isError
                  ? 'bg-rose-50'
                  : isNew
                    ? 'bg-blue-50'
                    : isUpdate
                      ? getDifferenceBgColor(row.difference)
                      : 'bg-slate-50'

                return (
                  <tr key={`${row.rowNumber}-${idx}`} className={`${inventoryTableRowClass} ${rowStatusClass}`}>
                    <td className={inventoryTableCellClass}>
                      <p className="font-mono text-sm font-medium text-slate-900">{row.spareCode || 'Auto-generate'}</p>
                    </td>
                    <td className={inventoryTableCellClass}>
                      <p className="text-sm font-medium text-slate-900">{row.itemName}</p>
                    </td>
                    <td className={inventoryTableCellClass}>
                      <p className="text-sm text-slate-700">{row.category}</p>
                    </td>
                    <td className={`${inventoryTableCellClass} text-center`}>
                      <p className="text-sm text-slate-700">{row.unit}</p>
                    </td>
                    <td className={`${inventoryTableCellClass} text-right tabular-nums`}>
                      <p className="text-sm text-slate-700">{row.currentStock}</p>
                    </td>
                    <td className={`${inventoryTableCellClass} text-right`}>
                      <input
                        type="number"
                        value={row.importedStock}
                        onChange={(event) => onUpdateImportedStock(idx, event.target.value)}
                        className="input h-10 w-24 text-right font-mono"
                        disabled={isError}
                      />
                    </td>
                    <td className={`${inventoryTableCellClass} text-center`}>
                      <div className={`font-mono font-bold text-sm ${getDifferenceColor(row.difference)}`}>
                        {row.difference > 0 ? '+' : ''}{row.difference}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{getStatusLabel(row.difference)}</p>
                    </td>
                    <td className={inventoryTableCellClass}>
                      <select
                        value={row.adjustmentReason || ''}
                        onChange={(event) => onUpdateAdjustmentReason?.(idx, event.target.value)}
                        className="input h-10 text-sm"
                        disabled={isError}
                      >
                        <option value="">Optional</option>
                        {ADJUSTMENT_REASONS.map((reason) => (
                          <option key={reason} value={reason}>{reason}</option>
                        ))}
                      </select>
                    </td>
                    <td className={inventoryTableCellClass}>
                      {isError ? (
                        <div className="space-y-1">
                          <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium bg-rose-100 text-rose-700">
                            ⚠ Error
                          </span>
                          {row.errors.length > 0 && (
                            <p className="text-xs text-red-600">
                              {row.errors[0]?.column}: {row.errors[0]?.message}
                            </p>
                          )}
                        </div>
                      ) : isNew ? (
                        <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700">
                          ➕ New
                        </span>
                      ) : isUpdate ? (
                        <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700">
                          ✔ Update
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700">
                          • No Change
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onPrevPage}
          disabled={page <= 1}
          className={inventoryPagerButtonClass}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNextPage}
          disabled={page >= totalPages}
          className={inventoryPagerButtonClass}
        >
          Next
        </button>
      </div>
    </div>
  )
}
