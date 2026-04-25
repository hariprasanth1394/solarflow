import { memo } from "react"

type StatCardProps = {
  title: string
  value: string | number
  hint?: string
}

function StatCardComponent({ title, value, hint }: StatCardProps) {
  return (
    <article className="card p-4 md:p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-3 text-[28px] font-semibold leading-[1.2] text-slate-900">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </article>
  )
}

const StatCard = memo(StatCardComponent)
export default StatCard
