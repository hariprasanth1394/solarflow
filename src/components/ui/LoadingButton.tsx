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
        "btn",
        className
      )}
    >
      {loading ? <Spinner /> : null}
      <span>{loading ? loadingLabel ?? children : children}</span>
    </button>
  )
}
