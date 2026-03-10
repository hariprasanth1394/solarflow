import type { ButtonHTMLAttributes, ReactNode } from "react"
import Spinner from "./Spinner"
import { cn } from "../../lib/utils"

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  loadingLabel?: string
  children: ReactNode
}

export default function LoadingButton({
  loading = false,
  loadingLabel,
  disabled,
  className,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {loading ? <Spinner /> : null}
      <span>{loading ? loadingLabel ?? children : children}</span>
    </button>
  )
}
