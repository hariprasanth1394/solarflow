"use client"

import { useEffect, useMemo, useState } from "react"
import { getCustomerReports, getInventoryReports, getTaskReports } from "../../services/reportService"
import Loader from "../../components/ui/Loader"
import LoadingButton from "../../components/ui/LoadingButton"

type GenericRow = Record<string, string | number | null>

type ReportType = "customers" | "tasks" | "inventory"

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("customers")
  const [customers, setCustomers] = useState<GenericRow[]>([])
  const [tasks, setTasks] = useState<GenericRow[]>([])
  const [inventory, setInventory] = useState<GenericRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let isActive = true

    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const [customersRes, tasksRes, inventoryRes] = await Promise.all([
          getCustomerReports(300),
          getTaskReports(300),
          getInventoryReports(300)
        ])

        if (!isActive) return

        setCustomers((customersRes.data ?? []) as GenericRow[])
        setTasks((tasksRes.data ?? []) as GenericRow[])
        setInventory((inventoryRes.data ?? []) as GenericRow[])
      } catch (loadError) {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : "Operation failed")
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      isActive = false
    }
  }, [])

  const rows = useMemo(() => {
    if (activeReport === "customers") return customers
    if (activeReport === "tasks") return tasks
    return inventory
  }, [activeReport, customers, tasks, inventory])

  const headers = useMemo(() => {
    if (!rows.length) return []
    return Object.keys(rows[0])
  }, [rows])

  const exportCsv = () => {
    if (!rows.length || !headers.length) return

    setExporting(true)
    try {
      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          headers
            .map((header) => {
              const raw = row[header]
              const text = raw === null || raw === undefined ? "" : String(raw)
              return `"${text.replace(/"/g, '""')}"`
            })
            .join(",")
        )
      ].join("\n")

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${activeReport}-report.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900">Reports</h2>
        <p className="mt-1 text-sm text-gray-600">Customer, task and inventory reports with CSV export.</p>
      </section>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              ["customers", "Customer Report"],
              ["tasks", "Task Report"],
              ["inventory", "Inventory Report"]
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveReport(key)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  activeReport === key ? "border-violet-300 bg-violet-50 text-violet-700" : "border-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <LoadingButton
            type="button"
            loading={exporting}
            loadingLabel="Exporting..."
            onClick={exportCsv}
            className="w-full bg-violet-600 text-white sm:w-auto"
          >
            Export CSV
          </LoadingButton>
        </div>
      </div>

      {loading ? <Loader label="Loading reports..." /> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] text-sm md:min-w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-500">
                {headers.map((header) => (
                  <th key={header} className="px-4 py-3">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(1, headers.length)} className="px-4 py-6 text-center text-gray-500">
                    No report data available
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    {headers.map((header) => (
                      <td key={header} className="px-4 py-3 text-gray-700">
                        {row[header] ?? "-"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
