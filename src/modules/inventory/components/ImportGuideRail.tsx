import type { LucideIcon } from "lucide-react"
import { ChevronRight } from "lucide-react"

export type ImportGuideStep = {
  title: string
  detail?: string
  icon: LucideIcon
}

type ImportGuideRailProps = {
  steps: ImportGuideStep[]
  variant: "card" | "strip" | "guide"
  activeStepIndex?: number
  className?: string
}

export default function ImportGuideRail({
  steps,
  variant,
  activeStepIndex,
  className = "",
}: ImportGuideRailProps) {
  if (variant === "guide") {
    return (
      <ol
        className={`inv-guide-rail inv-guide-rail--guide ${className}`.trim()}
        aria-label="How stock import works"
      >
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = activeStepIndex === index
          const isDone = activeStepIndex != null && index < activeStepIndex

          return (
            <li
              key={step.title}
              className={`inv-guide-rail-guide-item ${isActive ? "inv-guide-rail-guide-item--active" : ""} ${isDone ? "inv-guide-rail-guide-item--done" : ""}`}
            >
              <span className="inv-guide-rail-guide-index" aria-hidden="true">
                {index + 1}
              </span>
              <span className="inv-guide-rail-guide-icon" aria-hidden="true">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <div className="inv-guide-rail-guide-copy">
                <p className="inv-guide-rail-guide-title">{step.title}</p>
                {step.detail ? (
                  <p className="inv-guide-rail-guide-detail">{step.detail}</p>
                ) : null}
              </div>
            </li>
          )
        })}
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
