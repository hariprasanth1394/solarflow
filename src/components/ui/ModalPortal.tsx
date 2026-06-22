"use client"

import { ReactNode, useEffect } from "react"
import { createPortal } from "react-dom"

type ModalPortalProps = {
  children: ReactNode
  isOpen: boolean
  onClose?: () => void
  zIndex?: number
  closeOnEscape?: boolean
  closeOnBackdrop?: boolean
  preventCloseWhile?: boolean
}

export default function ModalPortal({
  children,
  isOpen,
  onClose,
  zIndex = 1000,
  closeOnEscape = true,
  closeOnBackdrop = true,
  preventCloseWhile = false,
}: ModalPortalProps) {
  const canClose = !preventCloseWhile

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !onClose) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape && canClose) {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isOpen, onClose, closeOnEscape, canClose])

  if (!isOpen) return null

  const handleBackdropClose = () => {
    if (onClose && closeOnBackdrop && canClose) onClose()
  }

  return createPortal(
    <div className="sf-modal-overlay modal-overlay-enter" style={{ zIndex }} role="presentation">
      {onClose ? <div className="sf-modal-backdrop absolute inset-0" onClick={handleBackdropClose} aria-hidden="true" /> : null}
      <div className="relative z-[1] flex h-full w-full items-end justify-center p-0 sm:items-center sm:p-4">{children}</div>
    </div>,
    document.body
  )
}
