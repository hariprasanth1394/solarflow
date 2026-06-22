"use client"

import { useState } from "react"
import LoadingButton from "../../components/ui/LoadingButton"
import ModalBusyOverlay from "../../components/ui/ModalBusyOverlay"
import ModalPortal from "../../components/ui/ModalPortal"

type Customer = {
  id: string
  name: string
}

// Inner component - no effects, state initialized from props
function DocumentUploadForm({
  open,
  loading,
  customers,
  onClose,
  onSubmit,
}: {
  open: boolean
  loading: boolean
  customers: Customer[]
  onClose: () => void
  onSubmit: (payload: { file: File; relatedCustomerId: string | null }) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [relatedCustomerId, setRelatedCustomerId] = useState("")

  return (
    <ModalPortal isOpen={open} onClose={onClose}>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (!file) return
          await onSubmit({ file, relatedCustomerId: relatedCustomerId || null })
        }}
        className={`card relative z-10 w-full max-w-xl p-4 shadow-2xl sm:p-5 ${loading ? "sf-modal-content-busy" : ""}`}
        aria-busy={loading}
      >
          <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
          <p className="mt-1 text-sm text-gray-500">Upload to Supabase Storage and store metadata in documents table.</p>

          <div className="mt-4 space-y-3">
            <input
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              required
              disabled={loading}
            />

            <select
              value={relatedCustomerId}
              onChange={(event) => setRelatedCustomerId(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              disabled={loading}
            >
              <option value="">Link to customer (optional)</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={loading} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm sm:w-auto disabled:opacity-50">
              Cancel
            </button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingLabel="Uploading..."
              showSpinner={false}
              disabled={!file || loading}
              className="w-full bg-violet-600 text-white sm:w-auto"
            >
              Upload
            </LoadingButton>
          </div>

          {loading ? <ModalBusyOverlay message="Uploading..." /> : null}
        </form>
    </ModalPortal>
  )
}

type UploadDocumentModalProps = {
  open: boolean
  loading: boolean
  customers: Customer[]
  onClose: () => void
  onSubmit: (payload: { file: File; relatedCustomerId: string | null }) => Promise<void>
}

export default function UploadDocumentModal(props: UploadDocumentModalProps) {
  return props.open ? (
    <DocumentUploadForm
      open={props.open}
      loading={props.loading}
      customers={props.customers}
      onClose={props.onClose}
      onSubmit={props.onSubmit}
    />
  ) : null
}
