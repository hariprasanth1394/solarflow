import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import Modal from "@/components/ui/Modal"

type WorkflowActionModalProps = {
  open: boolean
  title: string
  subtitle: string
  customerName: string
  stageLabel: string
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

const primaryButtonClass =
  "btn btn-primary"

const secondaryButtonClass =
  "btn btn-secondary"

export default function WorkflowActionModal({
  open,
  title,
  subtitle,
  customerName,
  stageLabel,
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
      subtitle={subtitle}
      showCloseButton
      panelClassName="max-w-2xl"
      bodyClassName="space-y-5"
      mobileFullscreen
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={onClose} className={secondaryButtonClass} disabled={loading}>
            Cancel
          </button>
          <button type="button" onClick={onSubmit} className={primaryButtonClass} disabled={loading || submitDisabled}>
            {loading ? loadingMessage || "Updating workflow..." : submitLabel}
          </button>
        </div>
      }
    >
      <div className="modal-action-context">
        <p className="context-tag">Action Context</p>
        <p className="context-line">
          <strong>Customer:</strong> {customerName}
        </p>
        <p className="context-line">
          <strong>Stage:</strong> {stageLabel}
        </p>
      </div>

      <div className={loading ? "pointer-events-none opacity-75" : ""}>{children}</div>

      {loading && loadingMessage ? <p className="text-xs font-medium text-blue-600">{loadingMessage}</p> : null}

      {errorMessage ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700" role="alert" aria-live="assertive">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <p>{errorMessage}</p>
              {showRetry && onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={loading || submitDisabled}
                  className="btn btn-secondary btn-compact h-9 border-rose-300 text-rose-700 hover:bg-rose-100"
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
