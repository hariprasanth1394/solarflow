import type { ReactNode } from "react"
import Button from "../ui/Button"
import Modal from "../ui/Modal"

type FormModalProps = {
  open: boolean
  title: string
  loading?: boolean
  onClose: () => void
  onSubmit: () => void
  children: ReactNode
}

export default function FormModal({ open, title, loading = false, onClose, onSubmit, children }: FormModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      }
    >
      {children}
    </Modal>
  )
}
