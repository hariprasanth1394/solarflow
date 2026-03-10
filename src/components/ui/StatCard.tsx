import { memo } from "react"

type StatCardProps = {
  title: string
  value: string | number
  hint?: string
}

function StatCardComponent({ title, value, hint }: StatCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </article>
  )
}

const StatCard = memo(StatCardComponent)
export default StatCard
