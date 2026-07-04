"use client"

import type { LucideIcon } from "lucide-react"
import { ChevronRight, Info } from "lucide-react"
import { useId, useState } from "react"

export type ImportGuideStep = {
  title: string
  detail?: string
  icon: LucideIcon
}

type ImportGuideRailProps = {
  steps: ImportGuideStep[]
  variant: "card" | "strip" | "guide" | "compact" | "flow"
  className?: string
}

function FlowStepDetails({
  steps,
  id,
  className = "",
}: {
  steps: ImportGuideStep[]
  id?: string
  className?: string
}) {
  return (
    <div id={id} className={className} role="region" aria-label="Step definitions">
      <p className="inv-guide-flow-popover-title">Step definitions</p>
      <ol className="inv-guide-flow-popover-list">
        {steps.map((step, index) => (
          <li key={step.title} className="inv-guide-flow-popover-item">
            <span className="inv-guide-flow-popover-index" aria-hidden="true">
              {index + 1}
            </span>
            <div className="inv-guide-flow-popover-copy">
              <p className="inv-guide-flow-popover-step">{step.title}</p>
              {step.detail ? (
                <p className="inv-guide-flow-popover-detail">{step.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function supportsHoverPopover() {
  if (typeof window === "undefined") return false
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches
}

export default function ImportGuideRail({
  steps,
  variant,
  className = "",
}: ImportGuideRailProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverId = useId()

  if (variant === "flow") {
    return (
      <div className={`inv-guide-flow ${className}`.trim()}>
        <div className="inv-guide-flow-header">
          <p className="inv-guide-flow-eyebrow">Import workflow</p>
          <div
            className={`inv-guide-flow-info-wrap ${popoverOpen ? "inv-guide-flow-info-wrap--open" : ""}`}
            onMouseEnter={() => {
              if (supportsHoverPopover()) setPopoverOpen(true)
            }}
            onMouseLeave={() => {
              if (supportsHoverPopover()) setPopoverOpen(false)
            }}
          >
            <button
              type="button"
              className="inv-guide-flow-info"
              aria-expanded={popoverOpen}
              aria-controls={`${popoverId}-desktop ${popoverId}-mobile`}
              aria-label="View step definitions"
              onClick={() => setPopoverOpen((prev) => !prev)}
            >
              <Info className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
            <FlowStepDetails
              steps={steps}
              id={`${popoverId}-desktop`}
              className={`inv-guide-flow-popover inv-guide-flow-popover--desktop ${popoverOpen ? "inv-guide-flow-popover--visible" : ""}`.trim()}
            />
          </div>
        </div>

        <ol className="inv-guide-flow-steps" aria-label="Import steps">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isLast = index === steps.length - 1

            return (
              <li key={step.title} className="inv-guide-flow-step">
                <div className="inv-guide-flow-step-body">
                  <span className="inv-guide-flow-step-num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="inv-guide-flow-step-icon" aria-hidden="true">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                  <p className="inv-guide-flow-step-title">{step.title}</p>
                </div>
                {!isLast ? <span className="inv-guide-flow-connector" aria-hidden="true" /> : null}
              </li>
            )
          })}
        </ol>

        {popoverOpen ? (
          <FlowStepDetails
            steps={steps}
            id={`${popoverId}-mobile`}
            className="inv-guide-flow-details inv-guide-flow-details--mobile"
          />
        ) : null}
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <div className={`inv-guide-compact ${className}`.trim()}>
        <div className="inv-guide-compact-bar">
          <span className="inv-guide-compact-dots" aria-hidden="true">
            {steps.map((step, index) => (
              <span key={step.title} className="inv-guide-compact-dot-wrap">
                <span className="inv-guide-compact-dot">{index + 1}</span>
                {index < steps.length - 1 ? (
                  <span className="inv-guide-compact-line" />
                ) : null}
              </span>
            ))}
          </span>
          <span className="inv-guide-compact-label">
            Guided in {steps.length} steps
          </span>
          <button
            type="button"
            className={`inv-guide-compact-info ${detailsOpen ? "inv-guide-compact-info--active" : ""}`}
            onClick={() => setDetailsOpen((prev) => !prev)}
            aria-expanded={detailsOpen}
            aria-label={detailsOpen ? "Hide import steps" : "Show import steps"}
          >
            <Info className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        {detailsOpen ? (
          <ol className="inv-guide-compact-details">
            {steps.map((step, index) => (
              <li key={step.title} className="inv-guide-compact-detail">
                <span className="inv-guide-compact-detail-index" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="inv-guide-compact-detail-copy">
                  <p className="inv-guide-compact-detail-title">{step.title}</p>
                  {step.detail ? (
                    <p className="inv-guide-compact-detail-text">{step.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    )
  }

  if (variant === "guide") {
    return (
      <ol
        className={`inv-guide-rail inv-guide-rail--guide ${className}`.trim()}
        aria-label="How stock import works"
      >
        {steps.map((step, index) => (
          <li key={step.title} className="inv-guide-rail-guide-item">
            <span className="inv-guide-rail-guide-index" aria-hidden="true">
              {index + 1}
            </span>
            <div className="inv-guide-rail-guide-copy">
              <p className="inv-guide-rail-guide-title">{step.title}</p>
              {step.detail ? (
                <p className="inv-guide-rail-guide-detail">{step.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    )
  }

  if (variant === "strip") {
    return (
      <ol
        className={`inv-guide-rail inv-guide-rail--strip ${className}`.trim()}
        aria-label="Import steps"
      >
        {steps.map((step, index) => {
          const Icon = step.icon
          const isLast = index === steps.length - 1

          return (
            <li key={step.title} className="inv-guide-rail-strip-item">
              <span className="inv-guide-rail-strip-marker" aria-hidden="true">
                <Icon className="inv-guide-rail-strip-icon" strokeWidth={1.75} />
              </span>
              <span className="inv-guide-rail-strip-copy">
                <span className="inv-guide-rail-strip-title">{step.title}</span>
                {step.detail ? (
                  <span className="inv-guide-rail-strip-detail">{step.detail}</span>
                ) : null}
              </span>
              {!isLast ? (
                <ChevronRight className="inv-guide-rail-strip-chevron" aria-hidden="true" />
              ) : null}
            </li>
          )
        })}
      </ol>
    )
  }

  return (
    <ol
      className={`inv-guide-rail inv-guide-rail--card ${className}`.trim()}
      aria-label="How import works"
    >
      {steps.map((step, index) => {
        const Icon = step.icon
        const stepNo = index + 1

        return (
          <li key={step.title} className="inv-guide-rail-card-item">
            <span className="inv-guide-rail-card-index" aria-hidden="true">
              {stepNo}
            </span>
            <span className="inv-guide-rail-card-marker" aria-hidden="true">
              <Icon className="inv-guide-rail-card-icon" strokeWidth={1.75} />
            </span>
            <p className="inv-guide-rail-card-title">{step.title}</p>
            {step.detail ? <p className="inv-guide-rail-card-detail">{step.detail}</p> : null}
          </li>
        )
      })}
    </ol>
  )
}
