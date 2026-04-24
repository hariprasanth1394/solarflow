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
  "inline-flex h-12 items-center rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.28)] transition-all hover:-translate-y-[1px] hover:from-blue-700 hover:to-violet-700 hover:shadow-[0_10px_24px_rgba(79,70,229,0.3)] active:scale-[0.97] disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-60"

const secondaryButtonClass =
  "inline-flex h-12 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.97]"

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
      <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50/70 px-4 py-3.5 ring-1 ring-inset ring-blue-100">
        <p className="text-xs font-semibold uppercase tracking-[0.04em] text-blue-600">Action Context</p>
        <p className="mt-1.5 text-sm text-slate-700">
          <span className="font-medium text-slate-900">Customer:</span> {customerName}
        </p>
        <p className="text-sm text-slate-700">
          <span className="font-medium text-slate-900">Stage:</span> {stageLabel}
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
                  className="inline-flex h-9 items-center rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
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
