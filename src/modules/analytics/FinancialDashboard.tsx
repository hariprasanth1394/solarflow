"use client"

import { useEffect, useMemo, useState } from "react"
import { getFinancialAnalytics } from "../../services/analyticsService"

type AnalyticsMetrics = {
  totalSales: number
  totalInstallations: number
  monthlyRevenue: Record<string, number>
  profitMargin: number
  capacityInstalled: number
  pipelineConversion: Record<string, number>
  installationCompletionRate: number
}

export default function FinancialDashboard() {
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)

  useEffect(() => {
    let active = true

    void (async () => {
      setLoading(true)
      try {
        const { data } = await getFinancialAnalytics()
        if (active) {
          setMetrics((data as AnalyticsMetrics) ?? null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const monthlyRevenueRows = useMemo(() => Object.entries(metrics?.monthlyRevenue ?? {}), [metrics])
  const conversionRows = useMemo(() => Object.entries(metrics?.pipelineConversion ?? {}), [metrics])

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900">Financial Analytics Dashboard</h2>
        <p className="mt-1 text-sm text-gray-600">Revenue, profit, capacity and conversion analytics.</p>
      </section>

      {loading ? <p className="text-sm text-gray-500">Loading analytics...</p> : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Total Sales" value={`₹ ${metrics?.totalSales ?? 0}`} />
        <MetricCard title="Total Installations" value={String(metrics?.totalInstallations ?? 0)} />
        <MetricCard title="Profit Margin" value={`${metrics?.profitMargin ?? 0}%`} />
        <MetricCard title="Capacity Installed" value={`${metrics?.capacityInstalled ?? 0} kW`} />
        <MetricCard title="Completion Rate" value={String(metrics?.installationCompletionRate ?? 0)} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard title="Monthly Revenue Chart" rows={monthlyRevenueRows} />
        <ChartCard title="Sales Pipeline Conversion" rows={conversionRows} />
        <ChartCard title="Installation Completion Rate" rows={[["Completed", metrics?.installationCompletionRate ?? 0]]} />
      </section>
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-2 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function ChartCard({ title, rows }: { title: string; rows: Array<[string, unknown]> }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      <div className="space-y-2">
        {rows.length === 0 ? <p className="text-sm text-gray-500">No data available</p> : null}
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {label}: {String(value)}
          </div>
        ))}
      </div>
    </div>
  )
}
