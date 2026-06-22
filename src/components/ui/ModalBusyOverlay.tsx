"use client"

import { Loader2 } from "lucide-react"

type ModalBusyOverlayProps = {
  message?: string
}

export default function ModalBusyOverlay({ message = "Processing..." }: ModalBusyOverlayProps) {
  return (
    <div className="sf-modal-busy-overlay" role="status" aria-live="polite" aria-busy="true">
      <Loader2 className="sf-modal-busy-spinner-icon" strokeWidth={2.5} aria-hidden="true" />
      <p className="sf-modal-busy-message">{message}</p>
    </div>
  )
}
