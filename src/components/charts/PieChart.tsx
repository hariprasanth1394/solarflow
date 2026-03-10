"use client"

import { useEffect, useState } from "react"
import { Cell, Pie, ResponsiveContainer, Tooltip, PieChart as RechartsPieChart } from "recharts"

const colors = ["#7c3aed", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444"]

export default function PieChart({ data, dataKey, nameKey }: { data: Record<string, string | number>[]; dataKey: string; nameKey: string }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0)
    return () => window.clearTimeout(timer)
  }, [])

  if (!mounted) {
    return <div className="h-full w-full rounded-xl bg-slate-50" />
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
      <RechartsPieChart>
        <Pie data={data} dataKey={dataKey} nameKey={nameKey} outerRadius={90} label>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}
