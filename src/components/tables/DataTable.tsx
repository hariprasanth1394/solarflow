"use client"

import { useMemo, useState } from "react"
import {
  inventorySectionCardClass,
  inventoryTableCellClass,
  inventoryTableClass,
  inventoryTableHeaderCellClass,
  inventoryTableHeaderRowClass,
  inventoryTableRowClass,
  inventoryTableWrapperClass,
} from "@/modules/inventory/components/inventoryTableStyles"
import Pagination from "../ui/Pagination"

type Column<T> = {
  key: keyof T | string
  label?: string
  header?: string
  sortable?: boolean
  filterable?: boolean
  render?: (row: T) => React.ReactNode
}

type DataTableProps<T extends Record<string, unknown>> = {
  rows: T[]
  columns: Column<T>[]
  rowKey?: ((row: T) => string) | string
  rowActions?: (row: T) => React.ReactNode
  pageSize?: number
  page?: number
  totalCount?: number
  onPageChange?: (page: number) => void
  loading?: boolean
  emptyLabel?: string
  enableSearch?: boolean
}

export default function DataTable<T extends Record<string, unknown>>({
  rows,
  columns,
  rowKey = "id",
  rowActions,
  pageSize = 10,
  page,
  totalCount,
  onPageChange,
  loading = false,
  emptyLabel = "No records found",
  enableSearch = true
}: DataTableProps<T>) {
  const [search, setSearch] = useState("")
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [internalPage, setInternalPage] = useState(1)
  const [columnFilter, setColumnFilter] = useState<Record<string, string>>({})

  const currentPage = page ?? internalPage

  const setPage = (nextPage: number) => {
    if (onPageChange) {
      onPageChange(nextPage)
      return
    }
    setInternalPage(nextPage)
  }

  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => {
        const searchMatch = Object.values(row).some((value) => String(value).toLowerCase().includes(search.toLowerCase()))
        const filterMatch = columns.every((column) => {
          if (!column.filterable) return true
          const filterValue = columnFilter[String(column.key)]
          if (!filterValue) return true
          return String(row[String(column.key)] ?? "").toLowerCase().includes(filterValue.toLowerCase())
        })
        return (!enableSearch || searchMatch) && filterMatch
      })
      .sort((a, b) => {
        if (!sortColumn) return 0
        const aValue = String(a[String(sortColumn)] ?? "")
        const bValue = String(b[String(sortColumn)] ?? "")
        const result = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: "base" })
        return sortDirection === "asc" ? result : -result
      })
  }, [rows, search, columns, columnFilter, sortColumn, sortDirection, enableSearch])

  const totalRows = totalCount ?? filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const paginatedRows = onPageChange ? filteredRows : filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const resolveRowKey = (row: T, index: number) => {
    if (typeof rowKey === "function") return rowKey(row)
    const value = row[rowKey]
    return typeof value === "string" ? value : `${index}`
  }

  return (
    <div className="space-y-4">
      {enableSearch || columns.some((column) => column.filterable) ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {enableSearch ? (
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search..."
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          ) : (
            <div />
          )}
          {columns
            .filter((column) => column.filterable)
            .slice(0, 2)
            .map((column) => (
              <input
                key={String(column.key)}
                value={columnFilter[String(column.key)] ?? ""}
                onChange={(event) => setColumnFilter((prev) => ({ ...prev, [String(column.key)]: event.target.value }))}
                placeholder={`Filter ${column.label ?? column.header ?? String(column.key)}`}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            ))}
        </div>
      ) : null}

      <div className={`hidden md:block ${inventoryTableWrapperClass}`}>
        <div className="w-full overflow-x-auto">
          <table className={`min-w-[900px] text-left md:min-w-full ${inventoryTableClass}`}>
            <thead>
              <tr className={inventoryTableHeaderRowClass}>
              {columns.map((column) => (
                <th key={String(column.key)} className={`${inventoryTableHeaderCellClass} whitespace-nowrap`}>
                  <button
                    type="button"
                    disabled={!column.sortable}
                    onClick={() => {
                      if (!column.sortable) return
                      if (sortColumn === column.key) {
                        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
                      } else {
                        setSortColumn(column.key as keyof T)
                        setSortDirection("asc")
                      }
                    }}
                    className="inline-flex items-center gap-1 disabled:cursor-default"
                  >
                    {column.label ?? column.header ?? String(column.key)}
                    {sortColumn === column.key ? (sortDirection === "asc" ? "↑" : "↓") : null}
                  </button>
                </th>
              ))}
              {rowActions ? <th className={`${inventoryTableHeaderCellClass} text-right`}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-4 py-10 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-4 py-10 text-center text-slate-500">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-700">{emptyLabel}</p>
                    <p className="text-xs text-slate-500">Try adjusting filters or add a new record to get started.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, index) => (
              <tr key={resolveRowKey(row, index)} className={inventoryTableRowClass}>
                {columns.map((column) => (
                  <td key={String(column.key)} className={`${inventoryTableCellClass} whitespace-nowrap text-slate-900`}>
                    {column.render ? column.render(row) : String(row[String(column.key)] ?? "-")}
                  </td>
                ))}
                {rowActions ? <td className={`${inventoryTableCellClass} text-right`}>{rowActions(row)}</td> : null}
              </tr>
            ))) }
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className={`${inventorySectionCardClass} px-4 py-6 text-center text-sm text-slate-500`}>Loading...</div>
        ) : paginatedRows.length === 0 ? (
          <div className={`${inventorySectionCardClass} px-4 py-6 text-center`}>
            <p className="text-sm font-medium text-slate-700">{emptyLabel}</p>
            <p className="mt-1 text-xs text-slate-500">Try adjusting filters or add a new record to get started.</p>
          </div>
        ) : (
          paginatedRows.map((row, index) => (
            <div
              key={resolveRowKey(row, index)}
              className={inventorySectionCardClass}
            >
              <div className="space-y-2">
                {columns.map((column) => (
                  <div key={String(column.key)} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-slate-500">{column.label ?? column.header ?? String(column.key)}</span>
                    <span className="text-right text-slate-700">{column.render ? column.render(row) : String(row[String(column.key)] ?? "-")}</span>
                  </div>
                ))}
              </div>
              {rowActions ? <div className="mt-3 border-t border-slate-200 pt-3">{rowActions(row)}</div> : null}
            </div>
          ))
        )}
      </div>

      <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
