import type { TextareaHTMLAttributes } from "react"
import { cn } from "../../lib/utils"

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export default function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-violet-500 focus:ring-2",
        className
      )}
    />
  )
}
