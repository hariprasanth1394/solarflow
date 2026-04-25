"use client"

import { useMemo, useState } from "react"

type SpareOption = { id: string; name: string; unit: string | null }

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

  const disabled = useMemo(() => !spareId || loading, [spareId, loading])

  if (!open) return null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit({ spare_id: spareId, quantity_required: Number(quantityRequired) || 1 })
    setSpareId("")
    setQuantityRequired("1")
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        <form onSubmit={handleSubmit} className="card my-6 w-full max-w-lg p-4 shadow-2xl sm:p-5">
          <h3 className="text-lg font-semibold text-slate-900">Add System Component</h3>
          <p className="mt-1 text-sm text-slate-600">Select a spare and define required quantity.</p>

          <div className="mt-4 space-y-3">
            <select
              value={spareId}
              onChange={(event) => setSpareId(event.target.value)}
              className="dropdown"
              required
            >
              <option value="">Select spare</option>
              {spares.map((spare) => (
                <option key={spare.id} value={spare.id}>
                  {spare.name} {spare.unit ? `(${spare.unit})` : ""}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              value={quantityRequired}
              onChange={(event) => setQuantityRequired(event.target.value)}
              className="input"
              required
            />
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="btn btn-secondary w-full sm:w-auto">
              Cancel
            </button>
            <button
              type="submit"
              disabled={disabled}
              className="btn btn-primary w-full sm:w-auto disabled:opacity-60"
            >
              {loading ? "Saving..." : "Add Component"}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
