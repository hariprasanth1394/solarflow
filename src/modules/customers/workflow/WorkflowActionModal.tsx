import type { ReactNode } from "react"
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
  children: ReactNode
  onClose: () => void
  onSubmit: () => void
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
  children,
  onClose,
  onSubmit,
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

      {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
    </Modal>
  )
}
