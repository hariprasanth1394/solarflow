"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, Search, SlidersHorizontal, X } from "lucide-react"
import AddSpareModal from "./AddSpareModal"
import EditStockModal from "./EditStockModal"
import SparePartsTable from "./SparePartsTable"
import { createSpare, deleteSpare, getSpares, getSuppliers, updateSpare, updateSpareStock } from "../../../services/spareService"
import LoadingButton from "../../../components/ui/LoadingButton"
import InventoryPageShell from "../components/InventoryPageShell"
import { inventorySectionCardClass } from "../components/inventoryTableStyles"

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

type AvailabilityFilter = "all" | "in_stock" | "out_of_stock"

const ROW_SIZE_OPTIONS = [25, 50, 100, 200] as const

function getSupplierName(value: SpareApiRow["suppliers"]) {
  if (!value) return "-"
  if (Array.isArray(value)) return value[0]?.name ?? "-"
  return value.name ?? "-"
}

export default function SparePartsPage() {
  const searchParams = useSearchParams()
  const [rows, setRows] = useState<SpareRow[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(ROW_SIZE_OPTIONS[0])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null)
  const [editingSpareId, setEditingSpareId] = useState<string | null>(null)
  const [deletingSpareId, setDeletingSpareId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editStockModalOpen, setEditStockModalOpen] = useState(false)
  const [editDetailsModalOpen, setEditDetailsModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedSpareForStockEdit, setSelectedSpareForStockEdit] = useState<SpareRow | null>(null)
  const [selectedSpareForEdit, setSelectedSpareForEdit] = useState<SpareRow | null>(null)
  const [selectedSpareForDetails, setSelectedSpareForDetails] = useState<SpareRow | null>(null)
  const [editCategory, setEditCategory] = useState("")
  const [editUnit, setEditUnit] = useState("")
  const [editMinStock, setEditMinStock] = useState("0")
  const [editCostPrice, setEditCostPrice] = useState("0")
  const [filterOpen, setFilterOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all")
  const [supplierFilter, setSupplierFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [message, setMessage] = useState("")
  const importSuccess = searchParams.get('import') === 'success'
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [pageSize, totalCount])
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (availabilityFilter !== "all") count += 1
    if (supplierFilter) count += 1
    if (categoryFilter.trim()) count += 1
    return count
  }, [availabilityFilter, categoryFilter, supplierFilter])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 300)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [searchInput])

  const loadSpares = useCallback(async () => {
    setLoading(true)
    const { data, count, error } = await getSpares({
      search: debouncedSearch,
      page,
      pageSize,
      availability: availabilityFilter,
      supplierId: supplierFilter || undefined,
      category: categoryFilter.trim() || undefined
    })
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
  }, [availabilityFilter, categoryFilter, debouncedSearch, page, pageSize, supplierFilter])

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
    if (!importSuccess) return

    setMessage('Import applied successfully. Spare stock counts are now refreshed.')
    queueMicrotask(() => {
      void loadSpares()
    })
  }, [importSuccess, loadSpares])

  useEffect(() => {
    queueMicrotask(() => {
      void loadSuppliers()
    })
  }, [loadSuppliers])

  useEffect(() => {
    setPage((currentPage) => {
      const nextPage = Math.min(Math.max(1, currentPage), totalPages)
      return nextPage === currentPage ? currentPage : nextPage
    })
  }, [totalPages])

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setPage(Math.min(Math.max(1, nextPage), totalPages))
    },
    [totalPages]
  )

  const handleUpdateStock = async (row: SpareRow, nextStockValue: number) => {
    setUpdatingStockId(row.id)
    try {
      await updateSpareStock(row.id, nextStockValue)
      setMessage("Stock updated successfully")
      await loadSpares()
      setEditStockModalOpen(false)
      setSelectedSpareForStockEdit(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation failed")
    } finally {
      setUpdatingStockId(null)
    }
  }

  const handleOpenEditDetails = (row: SpareRow) => {
    setSelectedSpareForEdit(row)
    setEditCategory(row.category ?? "")
    setEditUnit(row.unit ?? "")
    setEditMinStock(String(row.min_stock))
    setEditCostPrice(String(row.cost_price))
    setEditDetailsModalOpen(true)
  }

  const handleDeleteSpare = async (row: SpareRow) => {
    if (deletingSpareId) return
    const shouldDelete = window.confirm(`Delete ${row.name}? This action cannot be undone.`)
    if (!shouldDelete) return

    setDeletingSpareId(row.id)
    try {
      const { error } = await deleteSpare(row.id)
      if (error) {
        throw new Error("Operation failed")
      }
      setMessage("Spare deleted successfully")
      await loadSpares()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation failed")
    } finally {
      setDeletingSpareId(null)
    }
  }

  const handleSaveEditDetails = async () => {
    if (!selectedSpareForEdit) return

    const parsedMinStock = Number(editMinStock)
    const parsedCostPrice = Number(editCostPrice)

    if (Number.isNaN(parsedMinStock) || parsedMinStock < 0 || Number.isNaN(parsedCostPrice) || parsedCostPrice < 0) {
      setMessage("Please enter valid non-negative values")
      return
    }

    setEditingSpareId(selectedSpareForEdit.id)
    try {
      await updateSpare(selectedSpareForEdit.id, {
        category: editCategory.trim() || null,
        unit: editUnit.trim() || null,
        min_stock: parsedMinStock,
        cost_price: parsedCostPrice
      })
      setMessage("Spare details updated successfully")
      setEditDetailsModalOpen(false)
      setSelectedSpareForEdit(null)
      await loadSpares()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation failed")
    } finally {
      setEditingSpareId(null)
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(value)

  return (
    <InventoryPageShell
      title="Spares"
      subtitle="Track spare inventory, search quickly, and manage stock adjustments from one consistent workspace."
      actions={
        <LoadingButton
          type="button"
          onClick={() => setModalOpen(true)}
          className="hidden h-10 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition duration-200 hover:bg-blue-700 md:inline-flex"
        >
          Add Spare
        </LoadingButton>
      }
    >
      {message ? (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          {message}
        </div>
      ) : null}

      <section className={`${inventorySectionCardClass} flex items-center gap-2 md:hidden`}>
        <button
          type="button"
          onClick={() => setMobileSearchOpen((previous) => !previous)}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((previous) => !previous)}
          className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium ${
            activeFilterCount > 0 ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </section>

      {mobileSearchOpen ? (
        <section className={`${inventorySectionCardClass} space-y-2 md:hidden`}>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value)
                setPage(1)
              }}
              placeholder="Search by spare name, category, supplier..."
              aria-label="Search spare parts"
              className="h-12 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 transition duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("")
                  setDebouncedSearch("")
                  setPage(1)
                }}
                className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>
        </section>
      ) : null}

      {mobileFiltersOpen ? (
        <section className={`${inventorySectionCardClass} space-y-3 md:hidden`}>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Availability</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { key: "all", label: "All" },
                { key: "in_stock", label: "In stock" },
                { key: "out_of_stock", label: "Out of stock" }
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setAvailabilityFilter(option.key as AvailabilityFilter)
                    setPage(1)
                  }}
                  className={`h-10 rounded-lg border px-3 text-sm font-medium ${
                    availabilityFilter === option.key
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 text-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Supplier</label>
            <select
              value={supplierFilter}
              onChange={(event) => {
                setSupplierFilter(event.target.value)
                setPage(1)
              }}
              className="mt-1.5 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Category</label>
            <input
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value)
                setPage(1)
              }}
              placeholder="Filter by category"
              className="mt-1.5 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Rows per page</label>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(1)
              }}
              className="mt-1.5 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {ROW_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} rows
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setAvailabilityFilter("all")
                setSupplierFilter("")
                setCategoryFilter("")
                setPage(1)
              }}
              className="text-sm font-medium text-slate-500"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white"
            >
              Apply
            </button>
          </div>
        </section>
      ) : null}

      <section className={`${inventorySectionCardClass} hidden flex-wrap items-center justify-between gap-3 md:flex`}>
        <div className="min-w-0 flex-[1_1_42%]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value)
                setPage(1)
              }}
              placeholder="Search by spare name, category, supplier..."
              aria-label="Search spare parts"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 transition duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("")
                  setDebouncedSearch("")
                  setPage(1)
                }}
                className="absolute right-2 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value))
              setPage(1)
            }}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            aria-label="Rows per page"
          >
            {ROW_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} rows
              </option>
            ))}
          </select>

          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((previous) => !previous)}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                activeFilterCount > 0
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              aria-label="Open filters"
              aria-expanded={filterOpen}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>

            {filterOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-[320px] rounded-lg bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Availability</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { key: "all", label: "All" },
                      { key: "in_stock", label: "In stock" },
                      { key: "out_of_stock", label: "Out of stock" }
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setAvailabilityFilter(option.key as AvailabilityFilter)
                          setPage(1)
                        }}
                        className={`h-8 rounded-lg border px-2.5 text-xs font-medium ${
                          availabilityFilter === option.key
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Supplier</label>
                  <select
                    value={supplierFilter}
                    onChange={(event) => {
                      setSupplierFilter(event.target.value)
                      setPage(1)
                    }}
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">All suppliers</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Category</label>
                  <input
                    value={categoryFilter}
                    onChange={(event) => {
                      setCategoryFilter(event.target.value)
                      setPage(1)
                    }}
                    placeholder="Filter by category"
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAvailabilityFilter("all")
                      setSupplierFilter("")
                      setCategoryFilter("")
                      setPage(1)
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    Clear all
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="h-8 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="pb-24 md:pb-0">
        <SparePartsTable
          rows={rows}
          loading={loading}
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          onEdit={(row) => {
            handleOpenEditDetails(row)
          }}
          onUpdateStock={async (row) => {
            if (updatingStockId) return
            setSelectedSpareForStockEdit(row)
            setEditStockModalOpen(true)
          }}
          onViewDetails={(row) => {
            setSelectedSpareForDetails(row)
            setDetailsModalOpen(true)
          }}
          onDelete={handleDeleteSpare}
          onAddSpare={() => setModalOpen(true)}
        />
      </div>

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="fixed bottom-5 right-5 z-30 inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.35)] md:hidden"
      >
        <Plus className="h-4 w-4" />
        Add Spare
      </button>

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

      <EditStockModal
        key={`${selectedSpareForStockEdit?.id ?? "none"}-${selectedSpareForStockEdit?.stock_quantity ?? 0}-${editStockModalOpen ? "open" : "closed"}`}
        open={editStockModalOpen && Boolean(selectedSpareForStockEdit)}
        loading={Boolean(updatingStockId)}
        spareName={selectedSpareForStockEdit?.name ?? "Spare"}
        initialStock={selectedSpareForStockEdit?.stock_quantity ?? 0}
        onClose={() => {
          if (!updatingStockId) {
            setEditStockModalOpen(false)
            setSelectedSpareForStockEdit(null)
          }
        }}
        onSubmit={async (nextStock) => {
          if (!selectedSpareForStockEdit || updatingStockId) return
          await handleUpdateStock(selectedSpareForStockEdit, nextStock)
        }}
      />

      {editDetailsModalOpen && selectedSpareForEdit ? (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/40" onClick={() => setEditDetailsModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
            <div className="my-6 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
              <h3 className="text-lg font-semibold text-slate-900">Edit Spare</h3>
              <p className="mt-1 text-sm text-slate-600">Update settings for {selectedSpareForEdit.name}.</p>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  value={editCategory}
                  onChange={(event) => setEditCategory(event.target.value)}
                  placeholder="Category"
                  className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-700"
                />
                <input
                  value={editUnit}
                  onChange={(event) => setEditUnit(event.target.value)}
                  placeholder="Unit"
                  className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-700"
                />
                <input
                  type="number"
                  min={0}
                  value={editMinStock}
                  onChange={(event) => setEditMinStock(event.target.value)}
                  placeholder="Min stock"
                  className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-700"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editCostPrice}
                  onChange={(event) => setEditCostPrice(event.target.value)}
                  placeholder="Cost price"
                  className="h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-700"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditDetailsModalOpen(false)}
                  className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="button"
                  loading={Boolean(editingSpareId)}
                  loadingLabel="Saving..."
                  onClick={handleSaveEditDetails}
                  className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Save changes
                </LoadingButton>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {detailsModalOpen && selectedSpareForDetails ? (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/40" onClick={() => setDetailsModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
            <div className="my-6 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
              <h3 className="text-lg font-semibold text-slate-900">Spare Details</h3>
              <p className="mt-1 text-sm text-slate-600">Quick business view for {selectedSpareForDetails.name}.</p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Category</p>
                  <p className="mt-1 font-medium text-slate-900">{selectedSpareForDetails.category || "-"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Supplier</p>
                  <p className="mt-1 font-medium text-slate-900">{selectedSpareForDetails.supplierName || "-"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Stock</p>
                  <p className="mt-1 font-medium text-slate-900">{selectedSpareForDetails.stock_quantity}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Inventory value</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {formatCurrency(selectedSpareForDetails.stock_quantity * selectedSpareForDetails.cost_price)}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDetailsModalOpen(false)}
                  className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetailsModalOpen(false)
                    setSelectedSpareForStockEdit(selectedSpareForDetails)
                    setEditStockModalOpen(true)
                  }}
                  className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Update stock
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </InventoryPageShell>
  )
}
