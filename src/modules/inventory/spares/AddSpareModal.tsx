"use client"

import { useEffect, useMemo, useState } from "react"
import { Package, X } from "lucide-react"
import LoadingButton from "../../../components/ui/LoadingButton"
import ModalPortal from "../../../components/ui/ModalPortal"
import InventorySingleSelect from "../components/InventorySingleSelect"

type Supplier = { id: string; name: string }

type AddSpareModalProps = {
  open: boolean
  loading: boolean
  suppliers: Supplier[]
  categoryOptions: string[]
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

const UNIT_OPTIONS = [
  { label: "Pieces (pcs)", value: "pcs" },
  { label: "Numbers (nos)", value: "nos" },
  { label: "Set", value: "set" },
  { label: "Metre (m)", value: "m" },
  { label: "Kilogram (kg)", value: "kg" },
]

const DEFAULT_CATEGORY_SUGGESTIONS = ["Panels", "Inverters", "Batteries", "Cables", "Mounting", "Accessories"]

function resetFormState() {
  return {
    name: "",
    category: "",
    supplierId: "",
    unit: "",
    stockQuantity: "",
    minStock: "0",
    costPrice: "",
  }
}

export default function AddSpareModal({
  open,
  loading,
  suppliers,
  categoryOptions,
  onClose,
  onSubmit,
}: AddSpareModalProps) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [unit, setUnit] = useState("")
  const [stockQuantity, setStockQuantity] = useState("")
  const [minStock, setMinStock] = useState("0")
  const [costPrice, setCostPrice] = useState("")

  useEffect(() => {
    if (!open) return
    const initial = resetFormState()
    setName(initial.name)
    setCategory(initial.category)
    setSupplierId(initial.supplierId)
    setUnit(initial.unit)
    setStockQuantity(initial.stockQuantity)
    setMinStock(initial.minStock)
    setCostPrice(initial.costPrice)
  }, [open])

  const categorySelectOptions = useMemo(() => {
    const merged = [...new Set([...DEFAULT_CATEGORY_SUGGESTIONS, ...categoryOptions])].sort((a, b) =>
      a.localeCompare(b)
    )
    return merged.map((value) => ({ label: value, value }))
  }, [categoryOptions])

  const supplierSelectOptions = useMemo(
    () => suppliers.map((supplier) => ({ label: supplier.name, value: supplier.id })),
    [suppliers]
  )

  const disabled = useMemo(() => !name.trim() || loading, [name, loading])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled) return

    await onSubmit({
      name: name.trim(),
      category: category.trim() || null,
      supplier_id: supplierId || null,
      unit: unit.trim() || null,
      stock_quantity: stockQuantity.trim() === "" ? 0 : Number(stockQuantity),
      min_stock: minStock.trim() === "" ? 0 : Number(minStock),
      cost_price: costPrice.trim() === "" ? 0 : Number(costPrice),
    })

    const initial = resetFormState()
    setName(initial.name)
    setCategory(initial.category)
    setSupplierId(initial.supplierId)
    setUnit(initial.unit)
    setStockQuantity(initial.stockQuantity)
    setMinStock(initial.minStock)
    setCostPrice(initial.costPrice)
  }

  return (
    <ModalPortal isOpen={open} onClose={onClose} preventCloseWhile={loading}>
      <form onSubmit={handleSubmit} className="inv-spare-modal card relative z-10 w-full max-w-2xl shadow-2xl">
        <header className="inv-spare-modal-header">
          <div className="inv-spare-modal-header-copy">
            <span className="inv-spare-modal-icon" aria-hidden="true">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <h3 className="inv-spare-modal-title">Add Spare Part</h3>
              <p className="inv-spare-modal-subtitle">Add a new item to your organization inventory.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inv-spare-modal-close"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="inv-spare-modal-body">
          <section className="inv-form-section">
            <h4 className="inv-form-section-title">Basic information</h4>
            <div className="inv-form-grid">
              <div className="inv-form-field inv-form-field--full">
                <label htmlFor="spare-name" className="inv-form-label">
                  Spare name <span className="inv-form-required">*</span>
                </label>
                <input
                  id="spare-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. 550W Mono Panel"
                  className="input"
                  autoFocus
                  required
                />
              </div>

              <InventorySingleSelect
                inputId="spare-category"
                label="Category"
                placeholder="Select or type a category"
                value={category}
                onChange={setCategory}
                options={categorySelectOptions}
                creatable
                helperText="Choose an existing category or type a new one."
              />

              <InventorySingleSelect
                inputId="spare-supplier"
                label="Supplier"
                placeholder="Select supplier (optional)"
                value={supplierId}
                onChange={setSupplierId}
                options={supplierSelectOptions}
                helperText={suppliers.length === 0 ? "No suppliers yet — you can add this later." : undefined}
              />

              <InventorySingleSelect
                inputId="spare-unit"
                label="Unit"
                placeholder="Select unit (optional)"
                value={unit}
                onChange={setUnit}
                options={UNIT_OPTIONS}
                creatable
                helperText="How this spare is counted in stock."
              />
            </div>
          </section>

          <section className="inv-form-section">
            <h4 className="inv-form-section-title">Stock &amp; pricing</h4>
            <div className="inv-form-grid inv-form-grid--three">
              <div className="inv-form-field">
                <label htmlFor="spare-stock" className="inv-form-label">
                  Opening stock
                </label>
                <input
                  id="spare-stock"
                  type="number"
                  min={0}
                  value={stockQuantity}
                  onChange={(event) => setStockQuantity(event.target.value)}
                  placeholder="0"
                  className="input"
                />
              </div>

              <div className="inv-form-field">
                <label htmlFor="spare-min-stock" className="inv-form-label">
                  Min stock
                </label>
                <input
                  id="spare-min-stock"
                  type="number"
                  min={0}
                  value={minStock}
                  onChange={(event) => setMinStock(event.target.value)}
                  placeholder="0"
                  className="input"
                />
                <p className="inv-form-helper">Low-stock alert threshold.</p>
              </div>

              <div className="inv-form-field">
                <label htmlFor="spare-cost" className="inv-form-label">
                  Unit cost (₹)
                </label>
                <input
                  id="spare-cost"
                  type="number"
                  min={0}
                  step="0.01"
                  value={costPrice}
                  onChange={(event) => setCostPrice(event.target.value)}
                  placeholder="0.00"
                  className="input"
                />
              </div>
            </div>
          </section>
        </div>

        <footer className="inv-spare-modal-footer">
          <button type="button" onClick={onClose} disabled={loading} className="btn btn-secondary w-full sm:w-auto">
            Cancel
          </button>
          <LoadingButton
            type="submit"
            loading={loading}
            loadingLabel="Saving..."
            disabled={disabled}
            className="btn btn-primary w-full sm:w-auto"
          >
            Add Spare
          </LoadingButton>
        </footer>
      </form>
    </ModalPortal>
  )
}
