"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Eye, MoreHorizontal, Pencil, Plus, RefreshCw } from "lucide-react"
import {
  inventoryTableCellClass,
  inventoryTableClass,
  inventoryTableHeaderCellClass,
  inventoryTableHeaderRowClass,
  inventoryTableRowClass,
  inventoryTableWrapperClass,
} from "../components/inventoryTableStyles"

type SpareRow = {
  id: string
  name: string
  category: string | null
  supplierName: string
  unit: string | null
  stock_quantity: number
  min_stock: number
  cost_price: number
}

type SparePartsTableProps = {
  rows: SpareRow[]
  loading: boolean
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onEdit: (row: SpareRow) => void
  onUpdateStock: (row: SpareRow) => void
  onViewDetails: (row: SpareRow) => void
  onAddSpare: () => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value)
}

function getStockStatus(row: SpareRow) {
  if (row.stock_quantity <= 0) {
    return {
      label: "Out of stock",
      tone: "text-rose-600",
      dot: "bg-rose-500"
    }
  }

  if (row.stock_quantity <= row.min_stock) {
    return {
      label: "Low",
      tone: "text-amber-600",
      dot: "bg-amber-500"
    }
  }

  return {
    label: "Healthy",
    tone: "text-emerald-600",
    dot: "bg-emerald-500"
  }
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, -1, totalPages]
  }

  if (currentPage >= totalPages - 3) {
    return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, -1, currentPage - 1, currentPage, currentPage + 1, -1, totalPages]
}

function SparePartsTable({
  rows,
  loading,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onEdit,
  onUpdateStock,
  onViewDetails,
  onAddSpare
}: SparePartsTableProps) {
  const [openActionRowId, setOpenActionRowId] = useState<string | null>(null)
  const actionMenuRef = useRef<HTMLDivElement | null>(null)
  const totalPages = Math.ceil(totalCount / pageSize)
  const effectiveTotalPages = Math.max(1, totalPages)
  const currentPage = Math.min(Math.max(1, page), effectiveTotalPages)

  const visiblePages = useMemo(
    () => (totalCount === 0 ? [] : getVisiblePages(currentPage, effectiveTotalPages)),
    [currentPage, effectiveTotalPages, totalCount]
  )

  const canGoPrevious = totalCount > 0 && currentPage > 1
  const canGoNext = totalCount > 0 && currentPage < effectiveTotalPages
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const showingTo = totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount)

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!actionMenuRef.current) return
      if (!actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionRowId(null)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [])

  return (
    <div className={inventoryTableWrapperClass}>
      <div className="overflow-x-auto">
        <table className={`min-w-full ${inventoryTableClass}`}>
          <thead>
            <tr className={inventoryTableHeaderRowClass}>
              <th className={`${inventoryTableHeaderCellClass} sticky top-0 z-10 w-[20%] bg-white`}>Spare</th>
              <th className={`${inventoryTableHeaderCellClass} sticky top-0 z-10 w-[12%] bg-white`}>Category</th>
              <th className={`${inventoryTableHeaderCellClass} sticky top-0 z-10 w-[15%] bg-white`}>Supplier</th>
              <th className={`${inventoryTableHeaderCellClass} sticky top-0 z-10 w-[8%] bg-white`}>Unit</th>
              <th className={`${inventoryTableHeaderCellClass} sticky top-0 z-10 w-[9%] bg-white text-right`}>Stock</th>
              <th className={`${inventoryTableHeaderCellClass} sticky top-0 z-10 w-[9%] bg-white text-right`}>Min</th>
              <th className={`${inventoryTableHeaderCellClass} sticky top-0 z-10 w-[10%] bg-white`}>Status</th>
              <th className={`${inventoryTableHeaderCellClass} sticky top-0 z-10 w-[9%] bg-white text-right`}>Cost</th>
              <th className={`${inventoryTableHeaderCellClass} sticky top-0 z-10 w-[12%] bg-white text-right`}>Value</th>
              <th className={`${inventoryTableHeaderCellClass} sticky top-0 z-10 w-[6%] bg-white text-right`}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className={inventoryTableRowClass}>
                  <td className={inventoryTableCellClass} colSpan={10}>
                    <div className="h-4 w-full animate-pulse rounded-sm bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-14 text-center">
                  <div className="mx-auto max-w-sm space-y-2">
                    <p className="text-base font-semibold text-slate-900">No spare parts found</p>
                    <p className="text-sm text-slate-500">Try changing your filters or add a new spare to get started.</p>
                    <button
                      type="button"
                      onClick={onAddSpare}
                      className="mx-auto inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add spare
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`group ${inventoryTableRowClass}`}
                >
                  <td className={`${inventoryTableCellClass} font-medium text-slate-900`}>{row.name}</td>
                  <td className={inventoryTableCellClass}>{row.category || "-"}</td>
                  <td className={inventoryTableCellClass}>{row.supplierName || "-"}</td>
                  <td className={inventoryTableCellClass}>{row.unit || "-"}</td>
                  <td className={`${inventoryTableCellClass} text-right font-semibold tabular-nums text-slate-900`}>{row.stock_quantity}</td>
                  <td className={`${inventoryTableCellClass} text-right tabular-nums text-slate-900`}>{row.min_stock}</td>
                  <td className={inventoryTableCellClass}>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${getStockStatus(row).tone}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${getStockStatus(row).dot}`} />
                      {getStockStatus(row).label}
                    </span>
                  </td>
                  <td className={`${inventoryTableCellClass} text-right tabular-nums text-slate-900`}>{formatCurrency(Number(row.cost_price ?? 0))}</td>
                  <td className={`${inventoryTableCellClass} text-right font-semibold tabular-nums text-slate-900`}>
                    {formatCurrency(Number(row.stock_quantity ?? 0) * Number(row.cost_price ?? 0))}
                  </td>
                  <td className={`${inventoryTableCellClass} text-right`}>
                    <div className="relative inline-block" ref={openActionRowId === row.id ? actionMenuRef : null}>
                      <button
                        type="button"
                        onClick={() => setOpenActionRowId((current) => (current === row.id ? null : row.id))}
                        className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 transition duration-150 hover:bg-slate-200/70 hover:text-slate-800 focus:outline-none"
                        aria-label={`Open actions for ${row.name}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {openActionRowId === row.id ? (
                        <div className="absolute right-0 z-20 mt-1.5 w-44 rounded border border-slate-200 bg-white p-1.5 shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              onEdit(row)
                              setOpenActionRowId(null)
                            }}
                            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateStock(row)
                              setOpenActionRowId(null)
                            }}
                            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-100"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Update stock
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onViewDetails(row)
                              setOpenActionRowId(null)
                            }}
                            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-100"
                          >
                            <Eye className="h-4 w-4" />
                            View details
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="font-medium text-slate-600" aria-live="polite">
          Showing {showingFrom}–{showingTo} of {totalCount}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious}
            className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-2.5 text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>

          {visiblePages.map((pageNumber, index) =>
            pageNumber === -1 ? (
              <span key={`ellipsis-${index}`} className="px-1 text-slate-400">
                …
              </span>
            ) : (
              <button
                key={pageNumber}
                type="button"
                onClick={() => onPageChange(pageNumber)}
                className={`h-8 min-w-8 rounded border px-2 text-sm font-medium transition-colors ${
                  pageNumber === currentPage
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
                aria-current={pageNumber === currentPage ? "page" : undefined}
              >
                {pageNumber}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 bg-white px-2.5 text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(SparePartsTable)
