"use client"

import { useEffect, useMemo, useState } from "react"
import LoadingButton from "../../../components/ui/LoadingButton"
import ModalPortal from "../../../components/ui/ModalPortal"

type EditSystemModalProps = {
  open: boolean
  loading: boolean
  system: {
    system_name: string
    capacity_kw: number
    price: number | null
  } | null
  onClose: () => void
  onSubmit: (payload: { system_name: string; capacity_kw: number; price: number | null }) => Promise<void>
}

export default function EditSystemModal({ open, loading, system, onClose, onSubmit }: EditSystemModalProps) {
  const [systemName, setSystemName] = useState("")
  const [capacityKw, setCapacityKw] = useState("")
  const [price, setPrice] = useState("")

  useEffect(() => {
    if (!open || !system) return
    setSystemName(system.system_name)
    setCapacityKw(String(system.capacity_kw))
    setPrice(system.price != null ? String(system.price) : "")
  }, [open, system])

  const disabled = useMemo(() => {
    if (!systemName.trim() || !capacityKw || Number(capacityKw) <= 0 || loading) return true
    const parsedPrice = price.trim() === "" ? null : Number(price)
    if (parsedPrice != null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) return true
    return false
  }, [capacityKw, loading, price, systemName])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled) return

    const parsedPrice = price.trim() === "" ? null : Number(price)
    await onSubmit({
      system_name: systemName.trim(),
      capacity_kw: Number(capacityKw),
      price: parsedPrice,
    })
  }

  return (
    <ModalPortal isOpen={open && Boolean(system)} onClose={onClose}>
      <form onSubmit={handleSubmit} className="card relative z-10 w-full max-w-lg p-4 shadow-2xl sm:p-5">
        <h3 className="text-lg font-semibold text-slate-900">Edit System</h3>
        <p className="mt-1 text-sm text-slate-600">Update the basic template details for this system.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="edit-system-name" className="mb-1.5 block text-sm font-medium text-slate-700">
              System Name
            </label>
            <input
              id="edit-system-name"
              value={systemName}
              onChange={(event) => setSystemName(event.target.value)}
              placeholder="e.g. 15kW Solar System"
              className="input"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="edit-system-capacity" className="mb-1.5 block text-sm font-medium text-slate-700">
              Capacity (kW)
            </label>
            <input
              id="edit-system-capacity"
              type="number"
              min={0}
              step="0.01"
              value={capacityKw}
              onChange={(event) => setCapacityKw(event.target.value)}
              placeholder="Capacity in kW"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="edit-system-price" className="mb-1.5 block text-sm font-medium text-slate-700">
              Price (₹)
            </label>
            <input
              id="edit-system-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Optional list price"
              className="input"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn btn-secondary w-full sm:w-auto">
            Cancel
          </button>
          <LoadingButton
            type="submit"
            loading={loading}
            loadingLabel="Saving..."
            disabled={disabled}
            className="btn btn-primary w-full sm:w-auto"
          >
            Save Changes
          </LoadingButton>
        </div>
      </form>
    </ModalPortal>
  )
}
