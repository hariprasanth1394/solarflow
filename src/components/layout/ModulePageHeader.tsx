import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

type ModulePageHeaderProps = {
  title: string
  icon: LucideIcon
  actions?: ReactNode
  className?: string
}

export default function ModulePageHeader({
  title,
  icon: Icon,
  actions,
  className = "",
}: ModulePageHeaderProps) {
  return (
    <header className={`sf-module-header ${className}`.trim()}>
      <div className="sf-module-header-row">
        <div className="sf-module-header-main">
          <div className="sf-module-header-mark" aria-hidden="true">
            <Icon className="sf-module-header-mark-icon" strokeWidth={1.75} />
          </div>
          <div className="sf-module-header-copy">
            <h1 className="sf-module-header-title">
              <span className="sf-module-header-title-text">{title}</span>
            </h1>
          </div>
        </div>
        {actions ? <div className="sf-module-header-actions">{actions}</div> : null}
      </div>
    </header>
  )
}
