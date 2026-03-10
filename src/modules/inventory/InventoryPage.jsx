"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import DataTable from '../../components/tables/DataTable'
import SearchFilterBar from '../../components/forms/SearchFilterBar'
import {
  getInventoryDashboardMetrics,
  getSpares,
  getSystemAvailability,
  getSystemComponents,
  getSystems,
  removeSystemComponent
} from '../../services/inventoryService'
import { formatDateUTC } from '../../utils/dateFormat'

const pageSize = 10

const tabs = [
  { key: 'spares', label: 'Spare Parts Management' },
  { key: 'builder', label: 'Solar System Builder' },
  { key: 'availability', label: 'System Inventory Availability' },
  { key: 'dashboard', label: 'Inventory Dashboard' }
]

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('spares')
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedSystem, setSelectedSystem] = useState(null)
  const [components, setComponents] = useState([])
  const [dashboardMetrics, setDashboardMetrics] = useState({
    totalSpares: 0,
    lowStockItems: 0,
    systemsAvailable: 0,
    systemsOutOfStock: 0,
    recentTransactions: []
  })

  const loadTabData = useCallback(async () => {
    setLoading(true)

    if (activeTab === 'spares') {
      const { data, count } = await getSpares({ search, category: categoryFilter, page, pageSize })
      setRows(data)
      setTotalCount(count)
    }

    if (activeTab === 'builder') {
      const { data, count } = await getSystems({ page, pageSize })
      setRows(data)
      setTotalCount(count)
    }

    if (activeTab === 'availability') {
      const { data } = await getSystemAvailability()
      setRows(data)
      setTotalCount(data.length)
    }

    if (activeTab === 'dashboard') {
      const { data } = await getInventoryDashboardMetrics()
      if (data) setDashboardMetrics(data)
      setRows([])
      setTotalCount(0)
    }

    setLoading(false)
  }, [activeTab, search, categoryFilter, page])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTabData()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadTabData])

  const spareColumns = useMemo(
    () => [
      { key: 'name', header: 'Spare Name' },
      { key: 'category', header: 'Category' },
      { key: 'unit', header: 'Unit' },
      { key: 'stock', header: 'Stock' },
      { key: 'minimum_stock', header: 'Minimum Stock' },
      { key: 'supplier', header: 'Supplier' },
      { key: 'cost', header: 'Cost' },
      {
        key: 'status',
        header: 'Status',
        render: (row) => {
          const classes =
            row.status === 'In Stock'
              ? 'bg-emerald-100 text-emerald-700'
              : row.status === 'Low Stock'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'

          return <span className={`rounded-lg px-2 py-1 text-xs font-medium ${classes}`}>{row.status}</span>
        }
      },
      {
        key: 'actions',
        header: 'Actions',
        render: () => (
          <button type="button" className="rounded-lg border border-gray-200 px-2 py-1 text-xs">
            Edit
          </button>
        )
      }
    ],
    []
  )

  const systemsColumns = useMemo(
    () => [
      { key: 'name', header: 'System Name' },
      { key: 'capacity_kw', header: 'Capacity (kW)' },
      { key: 'components_count', header: 'Components Count' },
      {
        key: 'last_updated',
        header: 'Last Updated',
        render: (row) => formatDateUTC(row.last_updated)
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (row) => (
          <button
            type="button"
            onClick={async () => {
              setSelectedSystem(row)
              const { data } = await getSystemComponents(row.id)
              setComponents(data)
            }}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
          >
            View Components
          </button>
        )
      }
    ],
    []
  )

  const availabilityColumns = useMemo(
    () => [
      { key: 'name', header: 'System Name' },
      { key: 'capacity_kw', header: 'Capacity' },
      { key: 'required_components', header: 'Required Components' },
      { key: 'available_systems', header: 'Available Systems' },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{row.status}</span>
        )
      }
    ],
    []
  )

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900">Inventory Management</h2>
        <p className="mt-1 text-sm text-gray-600">Manage spares, systems, availability, and inventory insights.</p>
      </section>

      <div className="sticky top-0 z-20 rounded-2xl border border-gray-200 bg-white px-4 shadow-sm">
        <div className="flex min-w-max gap-8 overflow-x-auto border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key)
                setPage(1)
              }}
              className={`-mb-px border-b-2 py-4 text-sm transition ${
                activeTab === tab.key
                  ? 'border-violet-600 font-semibold text-violet-700'
                  : 'border-transparent text-gray-500 hover:border-violet-200 hover:text-violet-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'spares' && (
        <>
          <SearchFilterBar
            search={search}
            onSearchChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            placeholder="Search spare name, supplier, category..."
            filters={
              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value)
                  setPage(1)
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option>All</option>
                <option>Electrical</option>
                <option>Battery</option>
                <option>Connector</option>
                <option>Mechanical</option>
              </select>
            }
            actions={
              <>
                <button type="button" className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white">
                  Add Spare
                </button>
                <button type="button" className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  Export
                </button>
              </>
            }
          />

          <DataTable
            columns={spareColumns}
            rows={rows}
            loading={loading}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        </>
      )}

      {activeTab === 'builder' && (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <button type="button" className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white">
              Create System
            </button>
          </div>

          <DataTable
            columns={systemsColumns}
            rows={rows}
            loading={loading}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        </>
      )}

      {activeTab === 'availability' && (
        <DataTable columns={availabilityColumns} rows={rows} loading={loading} totalCount={totalCount} pageSize={pageSize} />
      )}

      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total Spare Parts</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{dashboardMetrics.totalSpares}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Low Stock Items</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{dashboardMetrics.lowStockItems}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Systems Available</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{dashboardMetrics.systemsAvailable}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Systems Out Of Stock</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{dashboardMetrics.systemsOutOfStock}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-base font-semibold text-gray-900">Inventory Distribution</h3>
              <div className="h-52 rounded-lg border border-dashed border-gray-200 bg-gray-50" />
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-base font-semibold text-gray-900">System Production Capacity</h3>
              <div className="h-52 rounded-lg border border-dashed border-gray-200 bg-gray-50" />
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-base font-semibold text-gray-900">Low Stock Alerts</h3>
              <div className="space-y-2">
                {dashboardMetrics.recentTransactions.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                    {item.transaction_type} · Qty {item.quantity}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSystem && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSelectedSystem(null)} />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-gray-200 bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedSystem.name}</h3>
                  <p className="text-sm text-gray-500">System Components</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSystem(null)}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-500">
                      <th className="py-2">Spare Name</th>
                      <th className="py-2">Quantity Required</th>
                      <th className="py-2">Unit</th>
                      <th className="py-2 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((component) => (
                      <tr key={component.id} className="border-b border-gray-100">
                        <td className="py-2">{component.spare_name}</td>
                        <td className="py-2">{component.quantity_required}</td>
                        <td className="py-2">{component.unit}</td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              await removeSystemComponent(component.id)
                              const { data } = await getSystemComponents(selectedSystem.id)
                              setComponents(data)
                            }}
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
