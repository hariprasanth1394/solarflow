"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import SearchFilterBar from "../../../components/forms/SearchFilterBar"
import AddSpareModal from "./AddSpareModal"
import SparePartsTable from "./SparePartsTable"
import { createSpare, getSpares, getSuppliers, updateSpareStock } from "../../../services/spareService"
import LoadingButton from "../../../components/ui/LoadingButton"

type Supplier = { id: string; name: string }

type SpareApiRow = {
  id: string
  name: string
  category: string | null
  unit: string | null
  stock_quantity: number
  min_stock: number
  cost_price: number
  supplier_id: string | null
  suppliers: { name: string } | { name: string }[] | null
}

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

const PAGE_SIZE = 10

function getSupplierName(value: SpareApiRow["suppliers"]) {
  if (!value) return "-"
  if (Array.isArray(value)) return value[0]?.name ?? "-"
  return value.name ?? "-"
}

export default function SparePartsPage() {
  const [rows, setRows] = useState<SpareRow[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [message, setMessage] = useState("")

  const loadSpares = useCallback(async () => {
    setLoading(true)
    const { data, count, error } = await getSpares({ search, page, pageSize: PAGE_SIZE })
    if (!error) {
      const mapped = (data as SpareApiRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        supplierName: getSupplierName(row.suppliers),
        unit: row.unit,
        stock_quantity: row.stock_quantity,
        min_stock: row.min_stock,
        cost_price: row.cost_price
      }))
      setRows(mapped)
      setTotalCount(count)
    }
    setLoading(false)
  }, [search, page])

  const loadSuppliers = useCallback(async () => {
    const { data } = await getSuppliers()
    setSuppliers(data as Supplier[])
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadSpares()
    })
  }, [loadSpares])

  useEffect(() => {
    queueMicrotask(() => {
      void loadSuppliers()
    })
  }, [loadSuppliers])

  const lowStockCount = useMemo(() => rows.filter((row) => row.stock_quantity <= row.min_stock).length, [rows])

  const handleUpdateStock = async (row: SpareRow) => {
    const nextValue = window.prompt(`Update stock for ${row.name}`, String(row.stock_quantity))
    if (nextValue === null) return
    setUpdatingStockId(row.id)
    try {
      await updateSpareStock(row.id, Number(nextValue))
      setMessage("Stock updated successfully")
      await loadSpares()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation failed")
    } finally {
      setUpdatingStockId(null)
    }
  }

  return (
    <div className="space-y-4">
      <SearchFilterBar
        search={search}
        onSearchChange={(value: string) => {
          setSearch(value)
          setPage(1)
        }}
        placeholder="Search spare by name or category"
        filters={<></>}
        actions={
          <LoadingButton type="button" onClick={() => setModalOpen(true)} className="w-full bg-violet-600 text-white sm:w-auto">
            Add Spare
          </LoadingButton>
        }
      />

      {message ? <p className="text-sm text-gray-600">{message}</p> : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
        Low stock alerts in current page: <span className="font-semibold text-gray-900">{lowStockCount}</span>
      </div>

      <SparePartsTable
        rows={rows}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        onPageChange={setPage}
        onUpdateStock={async (row) => {
          if (updatingStockId) return
          await handleUpdateStock(row)
        }}
      />

      <AddSpareModal
        open={modalOpen}
        loading={submitting}
        suppliers={suppliers}
        onClose={() => {
          if (!submitting) {
            setModalOpen(false)
          }
        }}
        onSubmit={async (payload) => {
          setSubmitting(true)
          try {
            const { error } = await createSpare(payload)
            if (!error) {
              setMessage("Spare created successfully")
              setModalOpen(false)
              await loadSpares()
            }
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Operation failed")
          } finally {
            setSubmitting(false)
          }
        }}
      />
    </div>
  )
}
