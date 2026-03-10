"use client"

import { memo, useMemo } from "react"
import DataTable from "../../../components/tables/DataTable"

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
  onUpdateStock: (row: SpareRow) => void
}

function SparePartsTable({
  rows,
  loading,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onUpdateStock
}: SparePartsTableProps) {
  const columns = useMemo(
    () => [
      { key: "name", header: "Name" },
      { key: "category", header: "Category" },
      { key: "supplierName", header: "Supplier" },
      { key: "unit", header: "Unit" },
      {
        key: "stock_quantity",
        header: "Stock Quantity",
        render: (row: SpareRow) => (
          <div className="flex items-center gap-2">
            <span>{row.stock_quantity}</span>
            {row.stock_quantity <= row.min_stock ? (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Low</span>
            ) : null}
          </div>
        )
      },
      { key: "min_stock", header: "Min Stock" },
      {
        key: "cost_price",
        header: "Cost Price",
        render: (row: SpareRow) => <span>₹ {Number(row.cost_price ?? 0).toFixed(2)}</span>
      },
      {
        key: "actions",
        header: "Actions",
        render: (row: SpareRow) => (
          <button
            type="button"
            onClick={() => onUpdateStock(row)}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
          >
            Update Stock
          </button>
        )
      }
    ],
    [onUpdateStock]
  )

  return (
    <DataTable
      columns={columns}
      rows={rows}
      loading={loading}
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={onPageChange}
      emptyLabel="No spare parts found"
    />
  )
}

export default memo(SparePartsTable)
