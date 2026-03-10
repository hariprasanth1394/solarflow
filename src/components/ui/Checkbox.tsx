import type { InputHTMLAttributes } from "react"

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

export default function Checkbox({ label, ...props }: CheckboxProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
      <input {...props} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
      {label ? <span>{label}</span> : null}
    </label>
  )
}
