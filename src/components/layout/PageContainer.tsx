import type { ReactNode } from "react"
import { Breadcrumb } from "../ui/Breadcrumb"

type BreadcrumbItem = {
  label: string
  href?: string
}

type PageContainerProps = {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  children: ReactNode
}

export default function PageContainer({ title, subtitle, breadcrumbs = [], actions, children }: PageContainerProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        {breadcrumbs.length > 0 ? <Breadcrumb items={breadcrumbs} /> : null}
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          {actions ? <div className="w-full md:w-auto">{actions}</div> : null}
        </div>
      </section>
      <section className="space-y-4 md:space-y-6">{children}</section>
    </div>
  )
}
