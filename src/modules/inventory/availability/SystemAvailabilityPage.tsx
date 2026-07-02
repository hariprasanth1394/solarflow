"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Search, X } from "lucide-react"
import { getStockAlerts, getSystemAvailability } from "../../../services/inventoryService"
import InventoryPageShell from "../components/InventoryPageShell"

type AvailabilityRow = {
  system_id: string
  system_name: string
  capacity_kw: number
  available_systems: number
}

type StockAlertRow = {
  id: string
  name: string
  stock_quantity: number
  min_stock: number
  unit: string | null
}

function buildTone(count: number) {
  if (count === 0) return "danger" as const
  if (count < 5) return "warning" as const
  return "success" as const
}

function matchesSystemSearch(row: AvailabilityRow, query: string) {
  if (!query) return true
  const normalized = query.toLowerCase()
  return (
    row.system_name.toLowerCase().includes(normalized) ||
    String(row.capacity_kw).includes(normalized) ||
    String(row.available_systems).includes(normalized)
  )
}

function matchesBottleneckSearch(row: StockAlertRow, query: string) {
  if (!query) return true
  const normalized = query.toLowerCase()
  return (
    row.name.toLowerCase().includes(normalized) ||
    String(row.stock_quantity).includes(normalized) ||
    String(row.min_stock).includes(normalized)
  )
}

export default function SystemAvailabilityPage() {
  const [rows, setRows] = useState<AvailabilityRow[]>([])
  const [alerts, setAlerts] = useState<StockAlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [systemSearch, setSystemSearch] = useState("")
  const [bottleneckSearch, setBottleneckSearch] = useState("")

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const [availabilityRes, alertsRes] = await Promise.all([getSystemAvailability(), getStockAlerts()])
      setRows((availabilityRes.data as AvailabilityRow[]) ?? [])
      setAlerts((alertsRes.data as StockAlertRow[]) ?? [])
      setLoading(false)
    }
    void run()
  }, [])

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.available_systems - a.available_systems),
    [rows]
  )

  const filteredRows = useMemo(() => {
    const query = systemSearch.trim()
    return sortedRows.filter((row) => matchesSystemSearch(row, query))
  }, [sortedRows, systemSearch])

  const bottleneckRows = useMemo(
    () => [...alerts].sort((a, b) => a.stock_quantity - b.stock_quantity),
    [alerts]
  )

  const filteredBottlenecks = useMemo(() => {
    const query = bottleneckSearch.trim()
    return bottleneckRows.filter((row) => matchesBottleneckSearch(row, query))
  }, [bottleneckRows, bottleneckSearch])

  return (
    <InventoryPageShell contentOnly>
      <div className="inv-availability-layout">
        <section className="inv-panel-card inv-elevated-card inv-availability-systems-panel">
          <header className="inv-panel-card-header inv-panel-card-header--stack">
            <div className="inv-panel-card-header-main">
              <h2 className="inv-section-title">How many systems can you build today?</h2>
              {!loading && sortedRows.length > 0 ? (
                <p className="inv-availability-meta">
                  {systemSearch.trim()
                    ? `${filteredRows.length} of ${sortedRows.length} systems`
                    : `${sortedRows.length} systems`}
                </p>
              ) : null}
            </div>

            <label className="inv-availability-search">
              <Search className="inv-availability-search-icon" aria-hidden="true" />
              <input
                type="search"
                value={systemSearch}
                onChange={(event) => setSystemSearch(event.target.value)}
                placeholder="Search systems or capacity..."
                aria-label="Search systems"
                className="inv-availability-search-input"
              />
              {systemSearch ? (
                <button
                  type="button"
                  onClick={() => setSystemSearch("")}
                  className="inv-availability-search-clear"
                  aria-label="Clear system search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </label>
          </header>

          <div className="inv-build-list inv-build-list--scrollable sf-scroll-area">
            {loading ? (
              <div className="inv-skeleton inv-skeleton--block" />
            ) : sortedRows.length === 0 ? (
              <p className="inv-availability-empty">No availability data.</p>
            ) : filteredRows.length === 0 ? (
              <p className="inv-availability-empty">No systems match your search.</p>
            ) : (
              filteredRows.map((row) => {
                const tone = buildTone(row.available_systems)
                const progress = row.available_systems === 0 ? 0 : Math.min(100, row.available_systems * 8)
                const barClass =
                  row.available_systems === 0 ? "inv-progress-bar inv-progress-bar--danger" : "inv-progress-bar"
                return (
                  <article key={row.system_id} className="inv-availability-row">
                    <div className="inv-availability-row-copy">
                      <p className="inv-build-row-title">{row.system_name}</p>
                      <p className="inv-build-row-meta">{row.capacity_kw} kW</p>
                      <div className="inv-progress inv-progress--sm">
                        <div className={barClass} style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <span className={`inv-build-count inv-build-count--${tone}`}>
                      {row.available_systems} units
                    </span>
                  </article>
                )
              })
            )}
          </div>
        </section>

        <section className="inv-panel-card inv-elevated-card inv-bottlenecks-panel">
          <header className="inv-panel-card-header inv-panel-card-header--stack">
            <div className="inv-panel-card-header-main">
              <h2 className="inv-section-title">Bottlenecks</h2>
              {!loading && bottleneckRows.length > 0 ? (
                <p className="inv-availability-meta">
                  {bottleneckSearch.trim()
                    ? `${filteredBottlenecks.length} of ${bottleneckRows.length} items`
                    : `${bottleneckRows.length} items`}
                </p>
              ) : null}
            </div>

            <label className="inv-availability-search">
              <Search className="inv-availability-search-icon" aria-hidden="true" />
              <input
                type="search"
                value={bottleneckSearch}
                onChange={(event) => setBottleneckSearch(event.target.value)}
                placeholder="Search bottlenecks..."
                aria-label="Search bottlenecks"
                className="inv-availability-search-input"
              />
              {bottleneckSearch ? (
                <button
                  type="button"
                  onClick={() => setBottleneckSearch("")}
                  className="inv-availability-search-clear"
                  aria-label="Clear bottleneck search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </label>
          </header>

          <div className="inv-bottleneck-list inv-bottleneck-list--scrollable sf-scroll-area">
            {loading ? (
              <div className="inv-skeleton inv-skeleton--block" />
            ) : bottleneckRows.length === 0 ? (
              <p className="inv-availability-empty">No bottlenecks detected.</p>
            ) : filteredBottlenecks.length === 0 ? (
              <p className="inv-availability-empty">No bottlenecks match your search.</p>
            ) : (
              filteredBottlenecks.map((row) => (
                <article key={row.id} className="inv-bottleneck-item">
                  <div className="inv-bottleneck-copy">
                    <p className="inv-bottleneck-title">{row.name}</p>
                    <p className="inv-bottleneck-meta">Min {row.min_stock}{row.unit ? ` ${row.unit}` : ""}</p>
                  </div>
                  <span className="inv-bottleneck-ratio">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {row.stock_quantity}/{row.min_stock}
                  </span>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </InventoryPageShell>
  )
}
