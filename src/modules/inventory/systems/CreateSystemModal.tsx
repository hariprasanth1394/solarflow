"use client"

import { useMemo, useState } from "react"
import LoadingButton from "../../../components/ui/LoadingButton"

type CreateSystemModalProps = {
  open: boolean
  loading: boolean
  onClose: () => void
  onSubmit: (payload: { system_name: string; capacity_kw: number }) => Promise<void>
}

export default function CreateSystemModal({ open, loading, onClose, onSubmit }: CreateSystemModalProps) {
  const [systemName, setSystemName] = useState("")
  const [capacityKw, setCapacityKw] = useState("")

  const disabled = useMemo(
    () => !systemName.trim() || !capacityKw || Number(capacityKw) <= 0 || loading,
    [capacityKw, loading, systemName]
  )

  if (!open) return null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled) return

    await onSubmit({
      system_name: systemName.trim(),
      capacity_kw: Number(capacityKw)
    })

    setSystemName("")
    setCapacityKw("")
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        <form onSubmit={handleSubmit} className="card my-6 w-full max-w-lg p-4 shadow-2xl sm:p-5">
          <h3 className="text-lg font-semibold text-slate-900">New System</h3>
          <p className="mt-1 text-sm text-slate-600">Create a new system template to start mapping components.</p>

          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="system-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                System Name
              </label>
              <input
                id="system-name"
                value={systemName}
                onChange={(event) => setSystemName(event.target.value)}
                placeholder="e.g. 15kW Solar System"
                className="input"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="system-capacity" className="mb-1.5 block text-sm font-medium text-slate-700">
                Capacity
              </label>
              <input
                id="system-capacity"
                type="number"
                min={0}
                value={capacityKw}
                onChange={(event) => setCapacityKw(event.target.value)}
                placeholder="Capacity in kW"
                className="input"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary w-full sm:w-auto"
            >
              Cancel
            </button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingLabel="Creating..."
              disabled={disabled}
              className="btn btn-primary w-full sm:w-auto"
            >
              Create
            </LoadingButton>
          </div>
        </form>
      </div>
    </>
  )
}
