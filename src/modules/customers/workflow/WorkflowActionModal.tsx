import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import Modal from "@/components/ui/Modal"
import ModalFooterActions from "@/components/ui/ModalFooterActions"

type WorkflowActionModalProps = {
  open: boolean
  title: string
  submitLabel: string
  loading: boolean
  loadingMessage?: string
  submitDisabled?: boolean
  errorMessage?: string
  showRetry?: boolean
  children: ReactNode
  onClose: () => void
  onSubmit: () => void
  onRetry?: () => void
}

export default function WorkflowActionModal({
  open,
  title,
  submitLabel,
  loading,
  loadingMessage,
  submitDisabled = false,
  errorMessage,
  showRetry = false,
  children,
  onClose,
  onSubmit,
  onRetry,
}: WorkflowActionModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      showCloseButton
      panelClassName="sf-modal-panel-wide sf-modal-panel-action"
      bodyClassName="space-y-4"
      mobileFullscreen
      busy={loading}
      busyMessage={loadingMessage || "Processing..."}
      preventCloseWhile={loading}
      onClose={onClose}
      footer={
        <ModalFooterActions
          onCancel={onClose}
          cancelDisabled={loading}
          submitLabel={submitLabel}
          loading={loading}
          useOverlayLoader
          submitDisabled={submitDisabled}
          onSubmit={onSubmit}
        />
      }
    >
      <div className="min-w-0 space-y-4">{children}</div>

      {errorMessage ? (
        <div className="sf-modal-alert" role="alert" aria-live="assertive">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <p>{errorMessage}</p>
              {showRetry && onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={loading || submitDisabled}
                  className="btn btn-secondary btn-compact h-9"
                >
                  Retry
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
