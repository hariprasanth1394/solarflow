import type { ReactNode } from "react"

export default function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 h-64 w-full">{children}</div>
    </section>
  )
}
