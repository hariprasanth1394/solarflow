"use client"

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react"

type ToastProps = {
  title: string
  description: string
  type?: "success" | "error" | "info"
  onClose?: () => void
}

const toneClassName = {
  success: "border-emerald-200 bg-white text-emerald-700",
  error: "border-rose-200 bg-white text-rose-700",
  info: "border-sky-200 bg-white text-sky-700"
} as const

const IconByType = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
} as const

export default function Toast({ title, description, type = "info", onClose }: ToastProps) {
  const Icon = IconByType[type]

  return (
    <div className={`rounded-2xl border p-3 shadow-[0_18px_40px_rgba(15,23,42,0.14)] ${toneClassName[type]}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 text-sm text-slate-600">{description}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close toast"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
