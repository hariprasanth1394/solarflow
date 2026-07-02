"use client"

import { useEffect, useMemo, useState } from "react"
import AppSpinner from "@/components/ui/AppSpinner"
import ModalPortal from "../../../components/ui/ModalPortal"
import InventoryCommandPicker from "../components/InventoryCommandPicker"

type SpareOption = {
  id: string
  name: string
  unit: string | null
  stock_quantity?: number
  min_stock?: number
}

type AddComponentModalProps = {
  open: boolean
  loading: boolean
  spares: SpareOption[]
  onClose: () => void
  onSubmit: (payload: { spare_id: string; quantity_required: number }) => Promise<void>
}

export default function AddComponentModal({ open, loading, spares, onClose, onSubmit }: AddComponentModalProps) {
  const [spareId, setSpareId] = useState("")
  const [quantityRequired, setQuantityRequired] = useState("1")
  const [isMobileSheet, setIsMobileSheet] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)")
    const update = () => setIsMobileSheet(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const options = useMemo(
    () =>
      spares.map((spare) => ({
        id: spare.id,
        label: spare.name,
        meta: spare.unit ? spare.unit : undefined,
      })),
    [spares]
  )

  const disabled = useMemo(() => !spareId || loading, [spareId, loading])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit({ spare_id: spareId, quantity_required: Number(quantityRequired) || 1 })
    setSpareId("")
    setQuantityRequired("1")
  }

  return (
    <ModalPortal isOpen={open} onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        className={`card relative z-10 w-full shadow-2xl ${
          isMobileSheet
            ? "inv-mobile-sheet inv-mobile-sheet--open max-w-none rounded-t-2xl rounded-b-none p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            : "max-w-lg p-4 sm:p-5"
        }`}
      >
        <div className="inv-modal-handle md:hidden" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-[var(--inv-text)]">Add Component</h3>
        <p className="mt-1 text-sm text-[var(--inv-secondary)]">Search and select a spare, then set required quantity.</p>

        <div className="mt-4 space-y-3">
          <InventoryCommandPicker
            options={options}
            value={spareId}
            onChange={setSpareId}
            disabled={loading}
            placeholder="Search component..."
          />

          <div>
            <label htmlFor="component-qty" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-[var(--inv-secondary)]">
              Required quantity
            </label>
            <input
              id="component-qty"
              type="number"
              min={1}
              value={quantityRequired}
              onChange={(event) => setQuantityRequired(event.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn btn-secondary w-full sm:w-auto">
            Cancel
          </button>
          <button type="submit" disabled={disabled} className="btn btn-primary w-full sm:w-auto disabled:opacity-60">
            {loading ? (
              <>
                <AppSpinner size="xs" label="Saving" />
                Saving...
              </>
            ) : (
              "Add Component"
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  )
}
