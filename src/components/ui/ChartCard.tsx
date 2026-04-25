import type { ReactNode } from "react"

export default function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-4 md:p-5">
      <h3 className="text-base font-medium text-slate-900">{title}</h3>
      <div className="mt-4 h-64 w-full">{children}</div>
    </section>
  )
}
