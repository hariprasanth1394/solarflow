"use client"

import { useMemo, useState } from "react"
import LoadingButton from "../../../components/ui/LoadingButton"

type Supplier = { id: string; name: string }

type AddSpareModalProps = {
  open: boolean
  loading: boolean
  suppliers: Supplier[]
  onClose: () => void
  onSubmit: (payload: {
    name: string
    category: string | null
    supplier_id: string | null
    unit: string | null
    stock_quantity: number
    min_stock: number
    cost_price: number
  }) => Promise<void>
}

export default function AddSpareModal({ open, loading, suppliers, onClose, onSubmit }: AddSpareModalProps) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [unit, setUnit] = useState("")
  const [stockQuantity, setStockQuantity] = useState("0")
  const [minStock, setMinStock] = useState("0")
  const [costPrice, setCostPrice] = useState("0")

  const disabled = useMemo(() => !name.trim() || loading, [name, loading])

  if (!open) return null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit({
      name: name.trim(),
      category: category.trim() || null,
      supplier_id: supplierId || null,
      unit: unit.trim() || null,
      stock_quantity: Number(stockQuantity) || 0,
      min_stock: Number(minStock) || 0,
      cost_price: Number(costPrice) || 0
    })
    setName("")
    setCategory("")
    setSupplierId("")
    setUnit("")
    setStockQuantity("0")
    setMinStock("0")
    setCostPrice("0")
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        <form onSubmit={handleSubmit} className="my-6 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:p-5">
          <h3 className="text-lg font-semibold text-gray-900">Add Spare Part</h3>
          <p className="mt-1 text-sm text-gray-500">Create a new spare item for your organization inventory.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              required
            />
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Category"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <select
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <input
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder="Unit (pcs, nos, set)"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              value={stockQuantity}
              onChange={(event) => setStockQuantity(event.target.value)}
              placeholder="Stock quantity"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              value={minStock}
              onChange={(event) => setMinStock(event.target.value)}
              placeholder="Min stock"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={costPrice}
              onChange={(event) => setCostPrice(event.target.value)}
              placeholder="Cost price"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
            />
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm sm:w-auto">
              Cancel
            </button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingLabel="Saving..."
              disabled={disabled}
              className="w-full bg-violet-600 text-white sm:w-auto"
            >
              Add Spare
            </LoadingButton>
          </div>
        </form>
      </div>
    </>
  )
}
