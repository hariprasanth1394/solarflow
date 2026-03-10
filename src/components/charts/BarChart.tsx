"use client"

import { useEffect, useState } from "react"
import { Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart as RechartsBarChart } from "recharts"

export default function BarChart({ data, xKey, yKey }: { data: Record<string, string | number>[]; xKey: string; yKey: string }) {
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
        <Bar dataKey={yKey} fill="#7c3aed" radius={[6, 6, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
