"use client"

import { cn } from "@/lib/utils"

const SIZE_CLASS = {
  xs: "sf-spinner--xs",
  sm: "sf-spinner--sm",
  md: "sf-spinner--md",
  lg: "sf-spinner--lg",
  xl: "sf-spinner--xl",
} as const

export type AppSpinnerSize = keyof typeof SIZE_CLASS

type AppSpinnerProps = {
  size?: AppSpinnerSize
  className?: string
  label?: string
  variant?: "default" | "onPrimary"
}

/**
 * iOS-safe loading spinner. Rotates a wrapper div (not the SVG) and uses
 * explicit stroke colors so it stays visible on mobile Safari/Chrome/Brave.
 */
export default function AppSpinner({
  size = "md",
  className,
  label = "Loading",
  variant = "default",
}: AppSpinnerProps) {
  return (
    <span
      className={cn(
        "sf-spinner",
        SIZE_CLASS[size],
        variant === "onPrimary" ? "sf-spinner--on-primary" : null,
        className
      )}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle className="sf-spinner__track" cx="12" cy="12" r="9.5" />
        <path className="sf-spinner__arc" d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" />
      </svg>
    </span>
  )
}
