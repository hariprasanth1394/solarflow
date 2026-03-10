"use client"

import { memo } from "react"

type ComponentRow = {
  id: string
  quantity_required: number
  spare_name: string
  unit: string | null
}

type SystemComponentsTableProps = {
  rows: ComponentRow[]
  loading: boolean
  onRemove: (componentId: string) => Promise<void>
}

function SystemComponentsTable({ rows, loading, onRemove }: SystemComponentsTableProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[760px] text-sm md:min-w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Spare</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Quantity Required</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  Loading components...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  No components in this system.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">{row.spare_name}</td>
                  <td className="px-4 py-3">{row.unit ?? "-"}</td>
                  <td className="px-4 py-3">{row.quantity_required}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void onRemove(row.id)}
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default memo(SystemComponentsTable)
