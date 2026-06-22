"use client"

import { ReactNode, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

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
  const onCloseRef = useRef(onClose)
  const canClose = !preventCloseWhile

  onCloseRef.current = onClose

  useBodyScrollLock(isOpen)

  useEffect(() => {
    if (!isOpen || !onClose) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape && canClose) {
        event.preventDefault()
        onCloseRef.current?.()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isOpen, onClose, closeOnEscape, canClose])

  if (!isOpen) return null

  const handleBackdropClose = () => {
    if (onClose && closeOnBackdrop && canClose) onCloseRef.current?.()
  }

  return createPortal(
    <div
      className="sf-modal-overlay modal-overlay-enter sf-modal-portal-shell"
      style={{ zIndex }}
      role="presentation"
      onTouchMove={(event) => {
        if (event.target === event.currentTarget) event.preventDefault()
      }}
    >
      {onClose ? <div className="sf-modal-backdrop absolute inset-0" onClick={handleBackdropClose} aria-hidden="true" /> : null}
      <div className="sf-modal-portal-content relative z-[1] flex h-full w-full items-end justify-center p-0 sm:items-center sm:p-4">
        {children}
      </div>
    </div>,
    document.body
  )
}
