"use client"

import { useEffect, useState } from "react"
import { getActivityLogs, getNotificationSummary } from "../../services/notificationsService"
import { formatDateTimeUTC, formatDateUTC } from "../../utils/dateFormat"

type NotificationData = {
  lowStockWarnings: { id: string; name: string; stock_quantity: number; min_stock: number }[]
  taskDeadlines: { id: string; title: string; due_date: string | null; priority: string }[]
  inventoryShortages: { system_id: string; system_name: string; available_systems: number }[]
  counts: {
    lowStockWarnings: number
    taskDeadlines: number
    inventoryShortages: number
  }
}

type ActivityLog = {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  details: unknown
  created_at: string
}

const emptyData: NotificationData = {
  lowStockWarnings: [],
  taskDeadlines: [],
  inventoryShortages: [],
  counts: {
    lowStockWarnings: 0,
    taskDeadlines: 0,
    inventoryShortages: 0
  }
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState<"alerts" | "activity">("alerts")
  const [summary, setSummary] = useState<NotificationData>(emptyData)
  const [logs, setLogs] = useState<ActivityLog[]>([])

  useEffect(() => {
    let isActive = true

    const load = async () => {
      setLoading(true)
      const [summaryRes, logRes] = await Promise.all([getNotificationSummary(), getActivityLogs(40)])

      if (!isActive) return

      if (summaryRes.data) setSummary(summaryRes.data)
      setLogs(logRes.data as ActivityLog[])
      setLoading(false)
    }

    void load()

    return () => {
      isActive = false
    }
  }, [])

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900">Notifications</h2>
        <p className="mt-1 text-sm text-gray-600">System alerts and recent activity logs.</p>
      </section>

      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActive("alerts")}
            className={`rounded-lg border px-3 py-2 text-sm ${
              active === "alerts" ? "border-violet-300 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-600"
            }`}
          >
            Alerts
          </button>
          <button
            type="button"
            onClick={() => setActive("activity")}
            className={`rounded-lg border px-3 py-2 text-sm ${
              active === "activity" ? "border-violet-300 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-600"
            }`}
          >
            Activity Logs
          </button>
        </div>
      </div>

      {loading ? <p className="text-sm text-gray-500">Loading notifications...</p> : null}

      {active === "alerts" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <AlertCard title="Low stock warnings" count={summary.counts.lowStockWarnings}>
            {summary.lowStockWarnings.length === 0 ? (
              <EmptyText text="No low stock warnings" />
            ) : (
              summary.lowStockWarnings.map((item) => (
                <Row key={item.id} left={item.name} right={`${item.stock_quantity} / ${item.min_stock}`} />
              ))
            )}
          </AlertCard>

          <AlertCard title="Task deadlines (7 days)" count={summary.counts.taskDeadlines}>
            {summary.taskDeadlines.length === 0 ? (
              <EmptyText text="No deadline alerts" />
            ) : (
              summary.taskDeadlines.map((item) => (
                <Row
                  key={item.id}
                  left={item.title}
                  right={item.due_date ? formatDateUTC(item.due_date) : "No due date"}
                />
              ))
            )}
          </AlertCard>

          <AlertCard title="Inventory shortages" count={summary.counts.inventoryShortages}>
            {summary.inventoryShortages.length === 0 ? (
              <EmptyText text="No system shortages" />
            ) : (
              summary.inventoryShortages.map((item) => (
                <Row key={item.system_id} left={item.system_name} right={`Available: ${item.available_systems}`} />
              ))
            )}
          </AlertCard>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] text-sm md:min-w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                      No activity logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-gray-700">{log.action}</td>
                      <td className="px-4 py-3 text-gray-700">{log.entity_type ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-700">{formatDateTimeUTC(log.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function AlertCard({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      <span className="text-sm text-gray-700">{left}</span>
      <span className="text-xs text-gray-500">{right}</span>
    </div>
  )
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-sm text-gray-500">{text}</p>
}
