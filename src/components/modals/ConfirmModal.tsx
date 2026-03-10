import Button from "../ui/Button"
import Modal from "../ui/Modal"

type ConfirmModalProps = {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmModal({ open, title, description, onConfirm, onClose }: ConfirmModalProps) {
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
          <Button variant="danger" onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      }
    >
      <p className="text-sm text-slate-600">{description}</p>
    </Modal>
  )
}
