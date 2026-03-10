import type { ReactNode } from "react"
import Modal from "@/components/ui/Modal"

type WorkflowActionModalProps = {
  open: boolean
  title: string
  loading: boolean
  children: ReactNode
  onClose: () => void
  onSubmit: () => void
}

const primaryButtonClass =
  "rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 px-4 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"

const secondaryButtonClass = "rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"

export default function WorkflowActionModal({ open, title, loading, children, onClose, onSubmit }: WorkflowActionModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButtonClass} disabled={loading}>
            Cancel
          </button>
          <button type="button" onClick={onSubmit} className={primaryButtonClass} disabled={loading}>
            {loading ? "Saving..." : "Submit"}
          </button>
        </div>
      }
    >
      {children}
    </Modal>
  )
}
