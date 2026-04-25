import type { SelectHTMLAttributes } from "react"
import { cn } from "../../lib/utils"

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export default function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={cn("dropdown", className)}
    >
      {children}
    </select>
  )
}
