"use client"

import AppSpinner, { type AppSpinnerSize } from "./AppSpinner"

type PageLoadingStateProps = {
  message?: string
  size?: AppSpinnerSize
  className?: string
}

export default function PageLoadingState({
  message = "Loading...",
  size = "lg",
  className = "",
}: PageLoadingStateProps) {
  return (
    <div className={`sf-page-busy-state ${className}`.trim()} role="status" aria-live="polite" aria-busy="true">
      <AppSpinner size={size} label={message} />
      {message ? <p className="sf-page-busy-message">{message}</p> : null}
    </div>
  )
}
