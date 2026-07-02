import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type InventoryStatCardProps = {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  tone?: "default" | "accent" | "blue" | "success" | "warning" | "danger"
  loading?: boolean
  className?: string
}

const toneClass: Record<NonNullable<InventoryStatCardProps["tone"]>, string> = {
  default: "",
  accent: "inv-stat-card--accent",
  blue: "inv-stat-card--blue",
  success: "inv-stat-card--success",
  warning: "inv-stat-card--warning",
  danger: "inv-stat-card--danger",
}

export default function InventoryStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  loading = false,
  className,
}: InventoryStatCardProps) {
  return (
    <article className={cn("inv-stat-card", toneClass[tone], className)}>
      <div className="inv-stat-card-body">
        <p className="inv-stat-card-label">{label}</p>
        {loading ? (
          <div className="inv-skeleton inv-skeleton--value" aria-hidden="true" />
        ) : (
          <p className="inv-stat-card-value">{value}</p>
        )}
        {hint ? <p className="inv-stat-card-hint">{hint}</p> : null}
      </div>
      {Icon ? (
        <span className="inv-stat-card-icon" aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
    </article>
  )
}
