"use client"

import type { ReactNode } from "react"
import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import ModalBusyOverlay from "./ModalBusyOverlay"

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
  closeOnEscape?: boolean
  closeOnBackdrop?: boolean
  preventCloseWhile?: boolean
  busy?: boolean
  busyMessage?: string
}

function panelSizeClass(panelClassName?: string) {
  if (!panelClassName) return ""
  if (panelClassName.includes("max-w-2xl") || panelClassName.includes("max-w-xl")) {
    return "sf-modal-panel-wide"
  }
  return ""
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  )
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
  closeOnEscape = true,
  closeOnBackdrop = true,
  preventCloseWhile = false,
  busy = false,
  busyMessage = "Processing...",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const canClose = !preventCloseWhile && !busy

  onCloseRef.current = onClose

  useBodyScrollLock(open)

  // Initial focus only when the modal opens — never on parent re-renders (fixes mobile input focus loss).
  useEffect(() => {
    if (!open) return

    const panel = panelRef.current
    if (!panel) return

    const frame = window.requestAnimationFrame(() => {
      const focusable = getFocusableElements(panel)
      focusable[0]?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape && canClose) {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== "Tab" || !panelRef.current) return

      const nodes = getFocusableElements(panelRef.current)
      if (nodes.length === 0) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, closeOnEscape, canClose])

  // Clear enter-animation transform on iOS so nested loaders can animate reliably.
  useEffect(() => {
    if (!open) return

    const panel = panelRef.current
    if (!panel) return

    const timer = window.setTimeout(() => {
      panel.style.transform = "none"
    }, 280)

    return () => {
      window.clearTimeout(timer)
      panel.style.transform = ""
    }
  }, [open])

  if (!open) return null

  const handleBackdropClose = () => {
    if (closeOnBackdrop && canClose) onCloseRef.current()
  }

  const handleCloseClick = () => {
    if (canClose) onCloseRef.current()
  }

  const modalContent = (
    <div
      className="sf-modal-overlay modal-overlay-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "sf-modal-title" : undefined}
    >
      <div className="sf-modal-backdrop" onClick={handleBackdropClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={`sf-modal-panel sf-modal-panel-interactive modal-panel-enter ${panelSizeClass(panelClassName)} ${
          mobileFullscreen ? "sf-modal-panel-mobile-fullscreen" : ""
        } ${panelClassName ?? ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        {title || subtitle || showCloseButton ? (
          <div className={`sf-modal-header ${headerClassName ?? ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {title ? (
                  <h3 id="sf-modal-title" className="sf-modal-title">
                    {title}
                  </h3>
                ) : null}
                {subtitle ? <p className="sf-modal-subtitle">{subtitle}</p> : null}
              </div>
              {showCloseButton ? (
                <button
                  type="button"
                  aria-label="Close"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleCloseClick()
                  }}
                  disabled={!canClose}
                  className="sf-modal-close sf-modal-close-touch disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <div
          className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${busy ? "sf-modal-content-busy" : ""}`}
          aria-busy={busy}
        >
          <div
            className={`sf-modal-body sf-scroll-area sf-modal-scroll-surface ${busy ? "sf-modal-body-busy" : ""} ${bodyClassName ?? ""}`}
          >
            {children}
          </div>
          {footer ? (
            <div
              className={`sf-modal-footer sf-modal-footer-sticky ${busy ? "sf-modal-footer-busy" : ""} ${footerClassName ?? ""}`}
            >
              {footer}
            </div>
          ) : null}
          {busy ? <ModalBusyOverlay message={busyMessage} /> : null}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
