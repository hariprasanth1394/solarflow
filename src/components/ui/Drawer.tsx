"use client"

import type { ReactNode } from "react"

type DrawerProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export default function Drawer({ open, title, onClose, children }: DrawerProps) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="border-b border-slate-200 px-4 py-3 text-base font-semibold">{title}</div>
        <div className="h-[calc(100%-57px)] overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  )
}
