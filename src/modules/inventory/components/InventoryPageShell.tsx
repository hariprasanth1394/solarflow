import { ReactNode } from "react"
import { inventoryPageContainerClass } from "./inventoryTableStyles"

type InventoryPageShellProps = {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

export default function InventoryPageShell({ title, subtitle, actions, children }: InventoryPageShellProps) {
  return (
    <div className={inventoryPageContainerClass}>
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {subtitle ? <p className="max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </div>
  )
}
