"use client"

import AppSpinner from "./AppSpinner"

type ModalBusyOverlayProps = {
  message?: string
}

/** Full-surface loading overlay for modals and forms during async submission. */
export default function ModalBusyOverlay({ message = "Processing..." }: ModalBusyOverlayProps) {
  return (
    <div
      className="sf-modal-busy-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <AppSpinner size="lg" label={message} />
      <p className="sf-modal-busy-message">{message}</p>
    </div>
  )
}

/** Alias for global loading overlay usage outside modals. */
export function LoadingOverlay(props: ModalBusyOverlayProps) {
  return <ModalBusyOverlay {...props} />
}
