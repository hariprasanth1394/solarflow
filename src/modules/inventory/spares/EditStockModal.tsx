"use client"

import { useMemo, useState } from "react"
import LoadingButton from "../../../components/ui/LoadingButton"

type EditStockModalProps = {
  open: boolean
  loading: boolean
  spareName: string
  initialStock: number
  onClose: () => void
  onSubmit: (nextStock: number) => Promise<void>
}

export default function EditStockModal({
  open,
  loading,
  spareName,
  initialStock,
  onClose,
  onSubmit
}: EditStockModalProps) {
  const [stockQuantity, setStockQuantity] = useState(() => String(initialStock))

  const normalizedStock = Number(stockQuantity)
  const disabled = useMemo(
    () => loading || stockQuantity.trim() === "" || Number.isNaN(normalizedStock) || normalizedStock < 0,
    [loading, normalizedStock, stockQuantity]
  )

  if (!open) return null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled) return
    await onSubmit(normalizedStock)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        <form onSubmit={handleSubmit} className="my-6 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
          <h3 className="text-lg font-semibold text-slate-900">Edit Stock</h3>
          <p className="mt-1 text-sm text-slate-600">Update stock quantity for {spareName}.</p>

          <div className="mt-4">
            <label htmlFor="edit-stock-quantity" className="mb-1.5 block text-sm font-medium text-slate-700">
              Stock Quantity
            </label>
            <input
              id="edit-stock-quantity"
              type="number"
              min={0}
              value={stockQuantity}
              onChange={(event) => setStockQuantity(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-700 placeholder:text-slate-400"
              placeholder="Enter stock quantity"
              autoFocus
            />
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-full rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
              Cancel
            </button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingLabel="Saving..."
              disabled={disabled}
              className="h-10 w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
            >
              Save
            </LoadingButton>
          </div>
        </form>
      </div>
    </>
  )
}
