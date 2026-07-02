"use client"

import { ArrowLeft, Check } from "lucide-react"

type ImportWorkflowHeaderProps = {
  steps: string[]
  currentStep: number
  onBack: () => void
  backLabel?: string
}

export default function ImportWorkflowHeader({
  steps,
  currentStep,
  onBack,
  backLabel = "Back"
}: ImportWorkflowHeaderProps) {
  const activeLabel = steps[currentStep - 1] ?? steps[0]
  const progressPercent = Math.round((currentStep / steps.length) * 100)

  return (
    <header className="inv-import-wizard-header">
      <div className="inv-import-wizard-top">
        <button type="button" onClick={onBack} className="inv-import-wizard-back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{backLabel}</span>
        </button>
        <p className="inv-import-wizard-step-mobile">
          Step {currentStep} of {steps.length} · {activeLabel}
        </p>
      </div>

      <div className="inv-stepper-progress" aria-hidden="true">
        <span
          className="inv-stepper-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ol className="inv-stepper" aria-label="Progress">
        {steps.map((label, index) => {
          const stepNo = index + 1
          const isActive = stepNo === currentStep
          const isDone = stepNo < currentStep
          const isLast = index === steps.length - 1

          return (
            <li
              key={label}
              className={`inv-stepper-item ${isActive ? "inv-stepper-item--active" : ""} ${isDone ? "inv-stepper-item--done" : ""}`}
            >
              <div className="inv-stepper-node">
                <span className="inv-stepper-marker" aria-hidden="true">
                  {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : stepNo}
                </span>
                <span className="inv-stepper-label">{label}</span>
              </div>
              {!isLast ? (
                <span
                  className={`inv-stepper-connector ${isDone ? "inv-stepper-connector--done" : ""}`}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </header>
  )
}
