"use client"

import { ReactNode, useEffect } from "react"
import { createPortal } from "react-dom"

type ModalPortalProps = {
  children: ReactNode
  isOpen: boolean
  onClose?: () => void
  zIndex?: number
}

export default function ModalPortal({ children, isOpen, onClose, zIndex = 1000 }: ModalPortalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 flex justify-center items-center p-4"
      style={{ zIndex }}
    >
      {onClose && (
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      {children}
    </div>,
    document.body
  )
}