import type { ReactNode } from "react"

type KanbanColumn<T> = {
  id: string
  title: string
  items: T[]
  renderItem: (item: T) => ReactNode
}

type KanbanBoardProps<T> = {
  columns: KanbanColumn<T>[]
}

export default function KanbanBoard<T>({ columns }: KanbanBoardProps<T>) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
      {columns.map((column) => (
        <section key={column.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{column.title}</h3>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{column.items.length}</span>
          </div>
          <div className="space-y-2">{column.items.map((item) => column.renderItem(item))}</div>
        </section>
      ))}
    </div>
  )
}
