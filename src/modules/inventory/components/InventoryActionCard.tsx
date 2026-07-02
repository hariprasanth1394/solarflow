import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

type InventoryActionCardProps = {
  title: string
  description?: string
  icon: LucideIcon
  action: ReactNode
  tone?: "import" | "export" | "neutral"
}

const toneClass = {
  import: "inv-action-card--import",
  export: "inv-action-card--export",
  neutral: "",
}

export default function InventoryActionCard({
  title,
  description,
  icon: Icon,
  action,
  tone = "neutral",
}: InventoryActionCardProps) {
  return (
    <article className={`inv-action-card inv-elevated-card ${toneClass[tone]}`}>
      <div className="inv-action-card-icon" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </div>
      <div className="inv-action-card-copy">
        <h3 className="inv-action-card-title">{title}</h3>
        {description ? <p className="inv-action-card-description">{description}</p> : null}
      </div>
      <div className="inv-action-card-cta">{action}</div>
    </article>
  )
}
