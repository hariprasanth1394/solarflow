"use client"

import { memo, useState } from "react"
import { Check, Puzzle, Trash2, X as XIcon } from "lucide-react"
import InventoryStatusBadge, { getStockStatus } from "../components/InventoryStatusBadge"
import { systemsTableClass, systemsTableWrapperClass } from "../components/inventoryTableStyles"

type ComponentRow = {
  id: string
  quantity_required: number
  spare_name: string
  unit: string | null
  stock_quantity: number
  min_stock: number
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
      className="inv-row-action inv-row-action--danger"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

function QuantityCell({ value }: { value: number }) {
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
          className="input h-8 w-16 px-2 text-right text-sm font-medium"
        />
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="inv-row-action inv-row-action--success"
          title="Save"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={handleCancel} className="inv-row-action" title="Cancel">
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button type="button" onClick={() => setIsEditing(true)} className="inv-qty-pill" title="Click to edit quantity">
      {value}
    </button>
  )
}

function AddComponentButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`inv-spares-add-btn inv-add-component-btn ${className}`.trim()}>
      <span className="inv-spares-add-btn-icon inv-action-btn-icon" aria-hidden="true">
        <Puzzle className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="inv-spares-add-btn-label">Add Component</span>
    </button>
  )
}

function TableHeader() {
  return (
    <thead>
      <tr>
        <th>Component</th>
        <th>Unit</th>
        <th className="text-right">Required Qty</th>
        <th>Availability</th>
        <th className="text-right" aria-label="Actions" />
      </tr>
    </thead>
  )
}

function SystemComponentsTable({ rows, loading, systemName, onAddComponent, onRemove }: SystemComponentsTableProps) {
  if (loading) {
    return (
      <div className={systemsTableWrapperClass}>
        <div className="inv-table-toolbar">
          <div>
            <h3 className="inv-table-toolbar-title">Components</h3>
          </div>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className={systemsTableClass}>
            <TableHeader />
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5}>
                    <div className="inv-skeleton inv-skeleton--row" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className={systemsTableWrapperClass}>
      <div className="inv-table-toolbar">
        <div>
          <h3 className="inv-table-toolbar-title">Bill of materials</h3>
        </div>
        {rows.length > 0 ? <AddComponentButton onClick={onAddComponent} /> : null}
      </div>

      {rows.length === 0 ? (
        <div className="inv-systems-empty">
          <p className="inv-systems-empty-title">No components added yet</p>
          <p className="inv-systems-empty-text">Add components to build {systemName}.</p>
          <AddComponentButton onClick={onAddComponent} className="mx-auto mt-3" />
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className={`${systemsTableClass} inv-systems-table--dense`}>
              <TableHeader />
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="group inv-table-row-interactive">
                    <td className="font-medium">{row.spare_name}</td>
                    <td className="inv-systems-table-muted">{row.unit ?? "—"}</td>
                    <td className="text-right">
                      <QuantityCell value={row.quantity_required} />
                    </td>
                    <td>
                      <InventoryStatusBadge
                        status={getStockStatus(row.stock_quantity, row.quantity_required, row.min_stock)}
                      />
                    </td>
                    <td className="text-right">
                      <RemoveButton onConfirmRemove={() => onRemove(row.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 p-3 md:hidden">
            {rows.map((row) => (
              <article key={row.id} className="inv-mobile-data-card inv-mobile-data-card--interactive">
                <div className="inv-mobile-data-card-head">
                  <p className="inv-mobile-data-card-title">{row.spare_name}</p>
                  <RemoveButton onConfirmRemove={() => onRemove(row.id)} />
                </div>
                <div className="inv-mobile-data-card-meta">
                  <span>{row.unit ?? "—"}</span>
                  <span>Qty {row.quantity_required}</span>
                </div>
                <InventoryStatusBadge
                  status={getStockStatus(row.stock_quantity, row.quantity_required, row.min_stock)}
                />
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default memo(SystemComponentsTable)
