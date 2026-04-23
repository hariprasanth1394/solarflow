'use client'

import {
  inventoryTableCellClass,
  inventoryTableClass,
  inventoryTableHeaderCellClass,
  inventoryTableHeaderRowClass,
  inventoryTableRowClass,
  inventoryTableWrapperClass,
} from './inventoryTableStyles'

type PreviewRow = {
  rowNumber: number
  itemCode: string
  itemName: string
  systemCode: string
  currentStock: number
  importedStock: number
  difference: number
  status: 'NEW' | 'UPDATED' | 'UNCHANGED' | 'ERROR'
  errors: Array<{ column: string; message: string }>
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
}

export default function PreviewTable({
  rows,
  showOnlyChanged,
  onToggleShowOnlyChanged,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
  onUpdateImportedStock
}: PreviewTableProps) {
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
                <th className={`${inventoryTableHeaderCellClass} text-left`}>Item</th>
                <th className={`${inventoryTableHeaderCellClass} text-left`}>System</th>
                <th className={`${inventoryTableHeaderCellClass} text-right`}>Current</th>
                <th className={`${inventoryTableHeaderCellClass} text-right`}>Imported</th>
                <th className={`${inventoryTableHeaderCellClass} text-right`}>Difference</th>
                <th className={`${inventoryTableHeaderCellClass} text-left`}>Status</th>
              </tr>
            </thead>
          <tbody>
            {rows.map((row, idx) => {
              const toneClass =
                row.status === 'ERROR'
                  ? 'text-rose-700 bg-rose-50'
                  : row.status === 'UPDATED'
                    ? 'text-amber-700 bg-amber-50'
                    : row.status === 'NEW'
                      ? 'text-blue-700 bg-blue-50'
                      : 'text-emerald-700 bg-emerald-50'

              return (
                <tr key={`${row.rowNumber}-${idx}`} className={inventoryTableRowClass}>
                  <td className={inventoryTableCellClass}>
                    <p className="font-medium text-slate-900">{row.itemCode}</p>
                    <p className="text-xs text-slate-500">{row.itemName}</p>
                  </td>
                  <td className={inventoryTableCellClass}>{row.systemCode}</td>
                  <td className={`${inventoryTableCellClass} text-right tabular-nums`}>{row.currentStock}</td>
                  <td className={`${inventoryTableCellClass} text-right`}>
                    <input
                      type="number"
                      value={row.importedStock}
                      onChange={(event) => onUpdateImportedStock(idx, event.target.value)}
                      className="h-10 w-24 rounded-lg border border-slate-300 px-3 text-right text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </td>
                  <td className={`${inventoryTableCellClass} text-right tabular-nums`}>{row.difference}</td>
                  <td className={inventoryTableCellClass}>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}>{row.status}</span>
                    {row.errors.length > 0 && (
                      <p className="mt-1 text-xs text-red-600">
                        {row.errors[0]?.column}: {row.errors[0]?.message}
                      </p>
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
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNextPage}
          disabled={page >= totalPages}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}
