import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Breadcrumb } from "../ui/Breadcrumb"
import ModulePageHeader from "./ModulePageHeader"

type BreadcrumbItem = {
  label: string
  href?: string
}

type PageContainerProps = {
  title: string
  icon: LucideIcon
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  children: ReactNode
}

export default function PageContainer({ title, icon, breadcrumbs = [], actions, children }: PageContainerProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      {breadcrumbs.length > 0 ? <Breadcrumb items={breadcrumbs} /> : null}
      <ModulePageHeader title={title} icon={icon} actions={actions} />
      <section className="space-y-4 md:space-y-6">{children}</section>
    </div>
  )
}
