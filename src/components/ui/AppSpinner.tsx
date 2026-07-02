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
  variant?: "default" | "onPrimary" | "inventory"
}

/**
 * Cross-browser spinner. A static outer shell holds an inner rotor div that
 * alone receives the CSS rotation keyframes — never combine translateZ and
 * rotate on the same element (breaks WebKit). Works in Chrome, Firefox,
 * Safari, iOS, and Android.
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
        variant === "onPrimary"
          ? "sf-spinner--on-primary"
          : variant === "inventory"
            ? "sf-spinner--inventory"
            : null,
        className
      )}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      <span className="sf-spinner__rotor" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle className="sf-spinner__track" cx="12" cy="12" r="9.5" />
          <path className="sf-spinner__arc" d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" />
        </svg>
      </span>
    </span>
  )
}
