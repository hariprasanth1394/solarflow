import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "../../lib/utils"

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
}

const variants: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  outline: "btn-secondary",
  ghost: "btn-secondary border-transparent",
  danger: "btn-danger"
}

const sizes: Record<ButtonSize, string> = {
  sm: "btn-compact",
  md: "",
  lg: "h-11 px-5"
}

export default function Button({ children, className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "btn",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  )
}