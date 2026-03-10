import type { SelectHTMLAttributes } from "react"
import { cn } from "../../lib/utils"

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export default function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={cn("h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none ring-violet-500 focus:ring-2", className)}
    >
      {children}
    </select>
  )
}
