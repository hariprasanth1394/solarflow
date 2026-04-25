"use client"

import { memo, useState } from "react"
import { Plus, Trash2, Check, X as XIcon } from "lucide-react"
import {
  inventoryTableCellClass,
  inventoryTableClass,
  inventoryTableHeaderCellClass,
  inventoryTableHeaderRowClass,
  inventoryTableRowClass,
  inventoryTableWrapperClass,
} from "../components/inventoryTableStyles"

type ComponentRow = {
  id: string
  quantity_required: number
  spare_name: string
  unit: string | null
}

type SystemComponentsTableProps = {
  rows: ComponentRow[]
  loading: boolean
  systemName: string
  onAddComponent: () => void
  onRemove: (componentId: string) => Promise<void>
}

function RemoveButton({ onConfirmRemove }: { onConfirmRemove: () => Promise<void> }) {
  const [isRemoving, setIsRemoving] = useState(false)

  const handleRemove = async () => {
    const confirmed = window.confirm("Remove this component from the selected system?")
    if (!confirmed) return

    setIsRemoving(true)
    try {
      await onConfirmRemove()
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleRemove()}
      disabled={isRemoving}
      aria-label="Remove component"
      title="Remove component"
      className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 transition duration-150 hover:bg-red-50 hover:text-red-600 focus:outline-none disabled:cursor-not-allowed"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

function QuantityCell({ value, rowId }: { value: number; rowId: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value.toString())
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    const newValue = parseInt(editValue, 10)
    if (Number.isNaN(newValue) || newValue <= 0) {
      setEditValue(value.toString())
      setIsEditing(false)
      return
    }

    if (newValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      // TODO: Call update API when available
      // For now, just close editing mode
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value.toString())
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <input
          type="number"
          min="1"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          autoFocus
          className="input h-9 w-16 px-2 text-right font-medium"
        />
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition duration-150 hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
          title="Save"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition duration-150 hover:bg-slate-100 hover:text-slate-600"
          title="Cancel"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="inline-flex h-8 min-w-[48px] items-center justify-end rounded px-2 font-medium tabular-nums text-slate-700 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
      title="Click to edit quantity"
    >
      {value}
    </button>
  )
}

function SystemComponentsTable({ rows, loading, systemName, onAddComponent, onRemove }: SystemComponentsTableProps) {
  if (loading) {
    return (
      <div className={inventoryTableWrapperClass}>
        <div className="overflow-x-auto">
          <table className={`min-w-full ${inventoryTableClass}`}>
            <thead>
              <tr className={inventoryTableHeaderRowClass}>
                <th className={inventoryTableHeaderCellClass}>Spare / Component</th>
                <th className={inventoryTableHeaderCellClass}>Unit</th>
                <th className={`${inventoryTableHeaderCellClass} text-right`}>Qty</th>
                <th className={`${inventoryTableHeaderCellClass} text-right`} />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={inventoryTableRowClass}>
                  <td className={inventoryTableCellClass} colSpan={4}>
                    <div className="h-4 w-full animate-pulse rounded-sm bg-slate-100" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className={inventoryTableWrapperClass}>
        <div className="overflow-x-auto">
          <table className={`min-w-full ${inventoryTableClass}`}>
            <thead>
              <tr className={inventoryTableHeaderRowClass}>
                <th className={inventoryTableHeaderCellClass}>Spare / Component</th>
                <th className={inventoryTableHeaderCellClass}>Unit</th>
                <th className={`${inventoryTableHeaderCellClass} text-right`}>Qty</th>
                <th className={`${inventoryTableHeaderCellClass} text-right`} />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="px-6 py-14 text-center">
                  <div className="mx-auto max-w-sm space-y-2">
                    <p className="text-base font-semibold text-slate-900">No components added yet</p>
                    <p className="text-sm text-slate-500">Add the spares required to build {systemName}.</p>
                    <button
                      type="button"
                      onClick={onAddComponent}
                      className="btn btn-primary mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      Add component
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className={inventoryTableWrapperClass}>
      <div className="overflow-x-auto">
        <table className={`min-w-full ${inventoryTableClass}`}>
          <thead>
            <tr className={inventoryTableHeaderRowClass}>
              <th className={inventoryTableHeaderCellClass}>Spare / Component</th>
              <th className={inventoryTableHeaderCellClass}>Unit</th>
              <th className={`${inventoryTableHeaderCellClass} text-right`}>Qty</th>
              <th className={`${inventoryTableHeaderCellClass} text-right`} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={`group ${inventoryTableRowClass}`}>
                <td className={`${inventoryTableCellClass} font-medium text-slate-900`}>{row.spare_name}</td>
                <td className={inventoryTableCellClass}>{row.unit ?? "—"}</td>
                <td className={`${inventoryTableCellClass} text-right`}>
                  <QuantityCell value={row.quantity_required} rowId={row.id} />
                </td>
                <td className={`${inventoryTableCellClass} text-right`}>
                  <RemoveButton onConfirmRemove={() => onRemove(row.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default memo(SystemComponentsTable)
