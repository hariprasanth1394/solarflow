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
        <form onSubmit={handleSubmit} className="my-6 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
          <h3 className="text-lg font-semibold text-slate-900">Add System Component</h3>
          <p className="mt-1 text-sm text-slate-600">Select a spare and define required quantity.</p>

          <div className="mt-4 space-y-3">
            <select
              value={spareId}
              onChange={(event) => setSpareId(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-700"
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
              className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-700"
              required
            />
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="h-10 w-full rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto">
              Cancel
            </button>
            <button
              type="submit"
              disabled={disabled}
              className="h-10 w-full rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
            >
              {loading ? "Saving..." : "Add Component"}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
