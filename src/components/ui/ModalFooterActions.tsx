"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"
import Spinner from "./Spinner"

type ModalFooterActionsProps = {
  onCancel: () => void
  cancelLabel?: string
  cancelDisabled?: boolean
  submitLabel: ReactNode
  loading?: boolean
  loadingLabel?: string
  submitDisabled?: boolean
  onSubmit?: () => void
  submitType?: ButtonHTMLAttributes<HTMLButtonElement>["type"]
  submitForm?: string
  useOverlayLoader?: boolean
}

export default function ModalFooterActions({
  onCancel,
  cancelLabel = "Cancel",
  cancelDisabled = false,
  submitLabel,
  loading = false,
  loadingLabel,
  submitDisabled = false,
  onSubmit,
  submitType = "button",
  submitForm,
  useOverlayLoader = false,
}: ModalFooterActionsProps) {
  return (
    <div className="sf-modal-footer-actions">
      <button
        type="button"
        onClick={onCancel}
        disabled={cancelDisabled || loading}
        className="btn btn-secondary"
      >
        {cancelLabel}
      </button>
      <button
        type={submitType}
        form={submitForm}
        onClick={onSubmit}
        disabled={loading || submitDisabled}
        className="btn btn-primary"
      >
        {loading && !useOverlayLoader ? (
          <>
            <Spinner />
            <span>{loadingLabel ?? submitLabel}</span>
          </>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  )
}
