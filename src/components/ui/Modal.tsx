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

function panelSizeClass(panelClassName?: string) {
  if (!panelClassName) return ""
  if (panelClassName.includes("max-w-2xl") || panelClassName.includes("max-w-xl")) {
    return "sf-modal-panel-wide"
  }
  return ""
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
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  const modalContent = (
    <div className="sf-modal-overlay modal-overlay-enter" role="dialog" aria-modal="true">
      <div className="sf-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className={`sf-modal-panel modal-panel-enter ${panelSizeClass(panelClassName)} ${
          mobileFullscreen ? "sf-modal-panel-mobile-fullscreen" : ""
        } ${panelClassName ?? ""}`}
      >
        {title || subtitle || showCloseButton ? (
          <div className={`sf-modal-header ${headerClassName ?? ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {title ? <h3 className="sf-modal-title">{title}</h3> : null}
                {subtitle ? <p className="sf-modal-subtitle">{subtitle}</p> : null}
              </div>
              {showCloseButton ? (
                <button type="button" aria-label="Close" onClick={onClose} className="sf-modal-close">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className={`sf-modal-body ${mobileFullscreen ? "pb-24" : ""} ${bodyClassName ?? ""}`}>{children}</div>
        {footer ? (
          <div
            className={`sf-modal-footer ${mobileFullscreen ? "sf-modal-footer-mobile-sticky" : ""} ${
              footerClassName ?? ""
            }`}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
