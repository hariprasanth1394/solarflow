import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import ModulePageHeader from "@/components/layout/ModulePageHeader"
import { inventoryPageContainerClass } from "./inventoryTableStyles"

type InventoryPageShellProps = {
  title?: string
  icon?: LucideIcon
  actions?: ReactNode
  children: ReactNode
  compact?: boolean
  contentOnly?: boolean
}

export default function InventoryPageShell({
  title,
  icon,
  actions,
  children,
  compact = false,
  contentOnly = false,
}: InventoryPageShellProps) {
  if (contentOnly) {
    return <div className="inv-tab-panel">{children}</div>
  }

  return (
    <div className={`${inventoryPageContainerClass} ${compact ? "inv-page-shell--compact" : ""}`}>
      {title && icon ? (
        <ModulePageHeader title={title} icon={icon} actions={actions} className="inv-module-header" />
      ) : null}
      {children}
    </div>
  )
}
