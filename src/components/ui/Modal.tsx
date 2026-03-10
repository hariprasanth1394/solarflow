"use client"

import type { ReactNode } from "react"

type ModalProps = {
  open: boolean
  title?: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
}

export default function Modal({ open, title, children, onClose, footer }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close modal" className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="border-b border-slate-100 px-4 py-3 md:px-6">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4 md:px-6">{children}</div>
        {footer ? <div className="border-t border-slate-100 px-4 py-3 md:px-6">{footer}</div> : null}
      </div>
    </div>
  )
}