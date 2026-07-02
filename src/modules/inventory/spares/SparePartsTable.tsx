"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import { makeSpareCodeKey } from "@/lib/inventoryImportNormalize"
import { Eye, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, AlertTriangle } from "lucide-react"
import InventoryTablePager from "../components/InventoryTablePager"
import {
  inventoryTableCellClass,
  inventoryTableClass,
  inventoryTableHeaderCellClass,
  inventoryTableHeaderRowClass,
  inventoryTableStickyHeaderCellClass,
  inventoryTableRowClass,
  inventoryTableWrapperClass,
  inventoryInlineMenuClass,
} from "../components/inventoryTableStyles"

type SpareRow = {
  id: string
  spare_code: string
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
  highlightedSpareCodes?: string[]
  loading: boolean
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
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

function formatUnitPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
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
    label: "In stock",
    tone: "inv-stock-status inv-stock-status--ok",
    dot: "inv-stock-status-dot inv-stock-status-dot--ok",
  }
}

function SparePartsTable({
  rows,
  highlightedSpareCodes = [],
  loading,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onUpdateStock,
  onViewDetails,
  onDelete,
  onAddSpare
}: SparePartsTableProps) {
  const [openActionRowId, setOpenActionRowId] = useState<string | null>(null)
  const actionMenuRef = useRef<HTMLDivElement | null>(null)
  const highlightedCodeSet = useMemo(
    () => new Set(highlightedSpareCodes.map((value) => makeSpareCodeKey(value))),
    [highlightedSpareCodes]
  )

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
              rows.map((row) => {
                const isHighlighted = highlightedCodeSet.has(makeSpareCodeKey(row.spare_code))

                return (
                <tr
                  key={row.id}
                  className={`group ${inventoryTableRowClass} ${isHighlighted ? "inv-spares-row--updated" : ""}`}
                >
                  <td className={`${inventoryTableCellClass} font-medium text-[var(--inv-text)]`}>
                    <div>{row.name}</div>
                    <div className="inv-table-mono text-xs text-[var(--inv-secondary)]">{row.spare_code}</div>
                  </td>
                  <td className={inventoryTableCellClass}>{row.category || "-"}</td>
                  <td className={inventoryTableCellClass}>{row.supplierName || "-"}</td>
                  <td className={inventoryTableCellClass}>{row.unit || "-"}</td>
                  <td className={`${inventoryTableCellClass} text-right font-bold tabular-nums text-[var(--inv-text)]`}>
                    {row.stock_quantity <= row.min_stock ? (
                      <span className="inv-stock-qty inv-stock-qty--low">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {row.stock_quantity}
                      </span>
                    ) : (
                      <span className={`inv-stock-qty inv-stock-qty--ok ${isHighlighted ? "inv-stock-qty--updated" : ""}`}>
                        {row.stock_quantity}
                      </span>
                    )}
                  </td>
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
                            Adjust stock
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
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="inv-mobile-spares-table md:hidden">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={`mobile-skeleton-${index}`} className="inv-mobile-spares-row inv-mobile-spares-row--skeleton">
              <div className="space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-4 w-8 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="inv-mobile-spares-empty">
            <p className="text-sm font-semibold text-slate-900">No spare parts found</p>
            <button type="button" onClick={onAddSpare} className="btn btn-primary inv-btn-page mx-auto mt-3">
              <Plus className="h-4 w-4" />
              Add Spare
            </button>
          </div>
        ) : (
          <>
            <div className="inv-mobile-spares-header">
              <span>SKU / NAME</span>
              <span>STOCK</span>
              <span>UNIT ₹</span>
            </div>
            {rows.map((row) => {
              const isHighlighted = highlightedCodeSet.has(makeSpareCodeKey(row.spare_code))
              const isLowStock = row.stock_quantity <= row.min_stock

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onViewDetails(row)}
                  className={`inv-mobile-spares-row ${isHighlighted ? "inv-mobile-spares-row--highlight" : ""}`}
                >
                  <div className="min-w-0 text-left">
                    <p className="inv-mobile-spares-name">{row.name}</p>
                    <p className="inv-mobile-spares-sku">{row.spare_code}</p>
                  </div>
                  <span
                    className={`inv-mobile-spares-stock ${isLowStock ? "inv-mobile-spares-stock--low" : ""} ${isHighlighted ? "inv-mobile-spares-stock--updated" : ""}`}
                  >
                    {isLowStock ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
                    {row.stock_quantity}
                  </span>
                  <span className="inv-mobile-spares-price">{formatUnitPrice(Number(row.cost_price ?? 0))}</span>
                </button>
              )
            })}
          </>
        )}
      </div>

      <InventoryTablePager
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        itemLabel="spares"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  )
}

export default memo(SparePartsTable)
