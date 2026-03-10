"use client"

import { useEffect, useState } from "react"
import { Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart as RechartsBarChart } from "recharts"

type StackedBarChartProps = {
  data: Record<string, string | number>[]
  xKey: string
  keys: string[]
}

const colors = ["#7c3aed", "#06b6d4", "#22c55e", "#f59e0b"]

export default function StackedBarChart({ data, xKey, keys }: StackedBarChartProps) {
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
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip />
        <Legend />
        {keys.map((key, index) => (
          <Bar key={key} dataKey={key} stackId="stack" fill={colors[index % colors.length]} />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
