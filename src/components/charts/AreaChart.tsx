"use client"

import { useEffect, useState } from "react"
import { Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, AreaChart as RechartsAreaChart } from "recharts"

export default function AreaChart({ data, xKey, yKey }: { data: Record<string, string | number>[]; xKey: string; yKey: string }) {
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
      <RechartsAreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip />
        <Area type="monotone" dataKey={yKey} stroke="#7c3aed" fill="#ddd6fe" />
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}
