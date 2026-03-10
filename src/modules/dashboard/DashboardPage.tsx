"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import ContentArea from "../../components/layout/ContentArea"
import FilterBar from "../../components/layout/FilterBar"
import PageContainer from "../../components/layout/PageContainer"
import AreaChart from "../../components/charts/AreaChart"
import BarChart from "../../components/charts/BarChart"
import DataTable from "../../components/tables/DataTable"
import Alert from "../../components/ui/Alert"
import ChartCard from "../../components/ui/ChartCard"
import StatCard from "../../components/ui/StatCard"
import { useResponsiveValidation } from "../../lib/responsive"
import { getDashboardSummary } from "../../services/reportService"
import AiInsightsPanel from "../ai/AiInsightsPanel"

type DashboardSummary = {
  totalCustomers: number
  activeTasks: number
  inventoryItems: number
  availableSolarSystems: number
  taskStatusSummary: Record<string, number>
  inventoryStockSummary: { name: string; stock_quantity: number; min_stock: number }[]
}

const initialSummary: DashboardSummary = {
  totalCustomers: 0,
  activeTasks: 0,
  inventoryItems: 0,
  availableSolarSystems: 0,
  taskStatusSummary: {},
  inventoryStockSummary: []
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<DashboardSummary>(initialSummary)
  const containerRef = useRef<HTMLDivElement>(null)
  const responsiveState = useResponsiveValidation(containerRef)

  useEffect(() => {
    let active = true

    void (async () => {
      setLoading(true)
      try {
        const { data } = await getDashboardSummary()
        if (active && data) {
          setSummary(data)
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

  const taskChartData = useMemo(
    () => Object.entries(summary.taskStatusSummary).map(([status, count]) => ({ status, count })),
    [summary.taskStatusSummary]
  )

  const inventoryChartData = useMemo(
    () =>
      summary.inventoryStockSummary.slice(0, 8).map((item) => ({
        name: item.name,
        stock: item.stock_quantity,
        min: item.min_stock
      })),
    [summary.inventoryStockSummary]
  )

  const recentTasks = useMemo(
    () => taskChartData.map((item, index) => ({ id: `${item.status}-${index}`, status: item.status, count: item.count })),
    [taskChartData]
  )

  const inventoryAlerts = useMemo(
    () => summary.inventoryStockSummary.filter((item) => item.stock_quantity <= item.min_stock).slice(0, 5),
    [summary.inventoryStockSummary]
  )

  return (
    <div ref={containerRef} className="space-y-4">
      <PageContainer
        title="Dashboard"
        subtitle="Solar Flow enterprise overview for revenue, tasks, inventory, and operations."
        breadcrumbs={[{ label: "Dashboard" }]}
      >
        <FilterBar>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="rounded-lg bg-slate-100 px-2 py-1">Mobile ready</span>
            <span className="rounded-lg bg-slate-100 px-2 py-1">Table scroll enabled</span>
            <span className="rounded-lg bg-slate-100 px-2 py-1">Cards responsive</span>
          </div>
        </FilterBar>

        <ContentArea>
          {!responsiveState.tableScrollable || responsiveState.hasHorizontalOverflow ? (
            <Alert
              variant="warning"
              title="Responsive validation warning"
              message="A container may overflow on small screens. Review table/card widths."
            />
          ) : null}

          <section data-responsive-cards="true" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total Customers" value={summary.totalCustomers} />
            <StatCard title="Active Tasks" value={summary.activeTasks} />
            <StatCard title="Inventory Items" value={summary.inventoryItems} />
            <StatCard title="Available Systems" value={summary.availableSolarSystems} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard title="Task Completion Overview">
              <BarChart data={taskChartData} xKey="status" yKey="count" />
            </ChartCard>
            <ChartCard title="Inventory Stock Trends">
              <AreaChart data={inventoryChartData} xKey="name" yKey="stock" />
            </ChartCard>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2" data-responsive-table="true">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent Tasks</h3>
              <DataTable
                rows={recentTasks}
                rowKey={(row) => row.id}
                columns={[
                  { key: "status", label: "Status", sortable: true, filterable: true },
                  { key: "count", label: "Count", sortable: true }
                ]}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Inventory Alerts</h3>
              <div className="space-y-2">
                {inventoryAlerts.length === 0 ? <p className="text-sm text-slate-500">No stock alerts.</p> : null}
                {inventoryAlerts.map((item) => (
                  <div key={item.name} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    {item.name}: {item.stock_quantity}/{item.min_stock}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Activity Feed</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                {taskChartData.slice(0, 4).map((item) => (
                  <li key={item.status} className="rounded-lg bg-slate-50 px-3 py-2">
                    Updated task status group: {item.status} ({item.count})
                  </li>
                ))}
              </ul>
            </div>
            <AiInsightsPanel />
          </section>
        </ContentArea>
      </PageContainer>

      {loading ? <p className="text-sm text-slate-500">Refreshing dashboard...</p> : null}
    </div>
  )
}
