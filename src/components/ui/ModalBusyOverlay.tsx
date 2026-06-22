"use client"

import AppSpinner from "./AppSpinner"

type ModalBusyOverlayProps = {
  message?: string
}

export default function ModalBusyOverlay({ message = "Processing..." }: ModalBusyOverlayProps) {
  return (
    <div className="sf-modal-busy-overlay" role="status" aria-live="polite" aria-busy="true" aria-label={message}>
      <AppSpinner size="lg" label={message} />
      <p className="sf-modal-busy-message">{message}</p>
    </div>
  )
}
