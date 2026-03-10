"use client"

import { useEffect, useRef, useState } from "react"
import LoadingButton from "../../components/ui/LoadingButton"

type Customer = {
  id: string
  name: string
}

// Inner component - no effects, state initialized from props
function DocumentUploadForm({
  loading,
  customers,
  onClose,
  onSubmit,
}: {
  loading: boolean
  customers: Customer[]
  onClose: () => void
  onSubmit: (payload: { file: File; relatedCustomerId: string | null }) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [relatedCustomerId, setRelatedCustomerId] = useState("")

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            if (!file) return
            await onSubmit({ file, relatedCustomerId: relatedCustomerId || null })
          }}
          className="my-6 w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:p-5"
        >
          <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
          <p className="mt-1 text-sm text-gray-500">Upload to Supabase Storage and store metadata in documents table.</p>

          <div className="mt-4 space-y-3">
            <input
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              required
            />

            <select
              value={relatedCustomerId}
              onChange={(event) => setRelatedCustomerId(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
            <button type="button" onClick={onClose} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm sm:w-auto">
              Cancel
            </button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingLabel="Uploading..."
              disabled={!file || loading}
              className="w-full bg-violet-600 text-white sm:w-auto"
            >
              Upload
            </LoadingButton>
          </div>
        </form>
      </div>
    </>
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
  const openCountRef = useRef(0)
  const [keyCounter, setKeyCounter] = useState(0)

  // Track when modal opens to generate a new key
  useEffect(() => {
    if (props.open) {
      openCountRef.current++
      setKeyCounter(openCountRef.current)
    }
  }, [props.open])

  if (!props.open) return null

  // Use a stable key based on open count
  // This resets all internal state automatically when modal opens
  const modalKey = `document-upload-${keyCounter}`

  return (
    <DocumentUploadForm
      key={modalKey}
      loading={props.loading}
      customers={props.customers}
      onClose={props.onClose}
      onSubmit={props.onSubmit}
    />
  )
}
