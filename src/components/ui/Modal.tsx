"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

type ModalProps = {
  open: boolean
  title?: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
  showCloseButton?: boolean
  panelClassName?: string
  bodyClassName?: string
  headerClassName?: string
  footerClassName?: string
  mobileFullscreen?: boolean
}

export default function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
  footer,
  showCloseButton = false,
  panelClassName,
  bodyClassName,
  headerClassName,
  footerClassName,
  mobileFullscreen = false,
}: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const modalContent = (
    <div className="modal-overlay fixed inset-0 z-[1000] flex justify-center items-center p-4">
      <div
        className="modal-overlay-bg absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`modal-content relative z-10 flex w-full max-w-lg flex-col border bg-white text-[color:var(--sf-text)] shadow-[0_18px_40px_rgba(15,23,42,0.16)] rounded-xl ${
          mobileFullscreen ? "max-h-[100dvh] min-h-[100dvh] rounded-none sm:max-h-[90vh] sm:min-h-0 sm:rounded-xl" : ""
        } ${panelClassName ?? ""}`}
        style={{
          width: 'min(520px, 92vw)',
          maxHeight: '90vh'
        }}
      >
        {title || subtitle || showCloseButton ? (
          <div className={`sf-modal-header border-b px-5 py-4 md:px-6 ${headerClassName ?? ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                {title ? <h3 className="text-[18px] font-semibold leading-tight text-slate-900">{title}</h3> : null}
                {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{subtitle}</p> : null}
              </div>
              {showCloseButton ? (
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className={`min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6 ${mobileFullscreen ? "pb-24" : ""} ${bodyClassName ?? ""}`}>{children}</div>
        {footer ? (
          <div
            className={`sf-modal-footer border-t px-5 py-4 backdrop-blur-sm md:px-6 ${
              mobileFullscreen ? "sticky bottom-0" : ""
            } ${footerClassName ?? ""}`}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}