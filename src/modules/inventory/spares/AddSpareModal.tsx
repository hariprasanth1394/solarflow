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
      <div className="fixed inset-0 z-40 bg-slate-900/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        <form onSubmit={handleSubmit} className="my-6 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
          <h3 className="text-lg font-semibold text-slate-900">Add Spare Part</h3>
          <p className="mt-1 text-sm text-slate-600">Create a new spare item for your organization inventory.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name"
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 placeholder:text-slate-400"
              required
            />
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Category"
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
            <select
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-700"
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
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
            <input
              type="number"
              min={0}
              value={stockQuantity}
              onChange={(event) => setStockQuantity(event.target.value)}
              placeholder="Stock quantity"
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
            <input
              type="number"
              min={0}
              value={minStock}
              onChange={(event) => setMinStock(event.target.value)}
              placeholder="Min stock"
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 placeholder:text-slate-400"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={costPrice}
              onChange={(event) => setCostPrice(event.target.value)}
              placeholder="Cost price"
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 placeholder:text-slate-400 md:col-span-2"
            />
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="h-10 w-full rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto">
              Cancel
            </button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingLabel="Saving..."
              disabled={disabled}
              className="h-10 w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
            >
              Add Spare
            </LoadingButton>
          </div>
        </form>
      </div>
    </>
  )
}
