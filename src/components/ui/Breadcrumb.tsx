import Link from "next/link"

type BreadcrumbItem = {
  label: string
  href?: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-2">
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
          {index < items.length - 1 ? <span>/</span> : null}
        </div>
      ))}
    </div>
  )
}
