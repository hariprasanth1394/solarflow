"use client"

type ModalBusyOverlayProps = {
  message?: string
}

export default function ModalBusyOverlay({ message = "Processing..." }: ModalBusyOverlayProps) {
  return (
    <div className="sf-modal-busy-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="sf-modal-busy-spinner" aria-hidden="true" />
      <p className="sf-modal-busy-message">{message}</p>
    </div>
  )
}
