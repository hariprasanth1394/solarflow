import type { InputHTMLAttributes } from "react"

type RadioProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

export default function Radio({ label, ...props }: RadioProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
      <input {...props} type="radio" className="h-4 w-4 border-slate-300 text-violet-600 focus:ring-violet-500" />
      {label ? <span>{label}</span> : null}
    </label>
  )
}
