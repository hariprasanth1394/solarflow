"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Eye, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import {
  inventoryTableCellClass,
  inventoryTableClass,
  inventoryTableHeaderCellClass,
  inventoryTableHeaderRowClass,
  inventoryTableStickyHeaderCellClass,
  inventoryTableRowClass,
  inventoryTableWrapperClass,
  inventoryMobileCardClass,
  inventoryInlineMenuClass,
  inventoryPagerButtonActiveClass,
  inventoryPagerButtonClass,
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
  onDelete: (row: SpareRow) => void
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
  onDelete,
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
      <div className="hidden overflow-x-auto md:block">
        <table className={`min-w-full ${inventoryTableClass}`}>
          <thead>
            <tr className={inventoryTableHeaderRowClass}>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[20%]`}>Spare</th>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[12%]`}>Category</th>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[15%]`}>Supplier</th>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[8%]`}>Unit</th>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[9%] text-right`}>Stock</th>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[9%] text-right`}>Min</th>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[10%]`}>Status</th>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[9%] text-right`}>Cost</th>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[12%] text-right`}>Value</th>
              <th className={`${inventoryTableHeaderCellClass} ${inventoryTableStickyHeaderCellClass} w-[6%] text-right`}>Actions</th>
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
                      className="btn btn-primary mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      Add spare
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
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
                        <div className={inventoryInlineMenuClass}>
                          <button
                            type="button"
                            onClick={() => {
                              onEdit(row)
                              setOpenActionRowId(null)
                            }}
                            className="dropdown-item flex items-center gap-2"
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
                            className="dropdown-item flex items-center gap-2"
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
                            className="dropdown-item flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View details
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDelete(row)
                              setOpenActionRowId(null)
                            }}
                            className="dropdown-item flex items-center gap-2 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
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

      <div className="space-y-3 p-3 md:hidden">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={`mobile-skeleton-${index}`} className={inventoryMobileCardClass}>
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="h-12 animate-pulse rounded bg-slate-100" />
                <div className="h-12 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className={`${inventoryMobileCardClass} px-4 py-10 text-center`}>
            <p className="text-base font-semibold text-slate-900">No spare parts found</p>
            <p className="mt-2 text-sm text-slate-500">Try changing your filters or add a new spare to get started.</p>
            <button
              type="button"
              onClick={onAddSpare}
              className="btn btn-primary mx-auto mt-4"
            >
              <Plus className="h-4 w-4" />
              Add spare
            </button>
          </div>
        ) : (
          rows.map((row) => {
            const stock = getStockStatus(row)
            const statusLeftBorder =
              stock.label === "Out of stock"
                ? "border-l-rose-500"
                : stock.label === "Low"
                ? "border-l-amber-500"
                : "border-l-emerald-500"
            return (
              <article key={row.id} className={`${inventoryMobileCardClass} border-l-4 ${statusLeftBorder}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-slate-900">{row.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{row.category || "Uncategorized"} • {row.unit || "Unit n/a"}</p>
                    <p className="mt-0.5 text-xs text-slate-400">Supplier: {row.supplierName || "-"}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold ${stock.tone}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${stock.dot}`} />
                    {stock.label}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">Stock</p>
                    <p className="mt-1 font-semibold text-slate-900">{row.stock_quantity}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">Min</p>
                    <p className="mt-1 font-semibold text-slate-900">{row.min_stock}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => onUpdateStock(row)}
                    className="btn btn-primary w-full"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Add Stock
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => onViewDetails(row)}
                      className="btn btn-secondary w-full"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="btn btn-secondary w-full"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    className="btn btn-secondary w-full border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </article>
            )
          })
        )}
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
            className={inventoryPagerButtonClass}
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
                className={pageNumber === currentPage ? inventoryPagerButtonActiveClass : inventoryPagerButtonClass}
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
            className={inventoryPagerButtonClass}
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
