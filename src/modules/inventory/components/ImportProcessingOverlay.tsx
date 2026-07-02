"use client"

import AppSpinner from "@/components/ui/AppSpinner"

type ImportProcessingOverlayProps = {
  label: string
  description?: string
}

export default function ImportProcessingOverlay({ label, description }: ImportProcessingOverlayProps) {
  return (
    <div className="inv-import-processing" role="status" aria-live="polite" aria-busy="true" aria-label={label}>
      <div className="inv-import-processing-card">
        <div className="inv-import-processing-spinner" aria-hidden="true">
          <span className="inv-import-processing-spinner-ring" />
          <AppSpinner size="lg" label={label} variant="inventory" />
        </div>
        <div className="inv-import-processing-copy">
          <p className="inv-import-processing-label">{label}</p>
          {description ? <p className="inv-import-processing-description">{description}</p> : null}
        </div>
        <div className="inv-import-processing-progress" aria-hidden="true">
          <span className="inv-import-processing-progress-bar" />
        </div>
      </div>
    </div>
  )
}
