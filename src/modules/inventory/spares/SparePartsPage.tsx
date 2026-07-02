"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PackagePlus, Search, X } from "lucide-react"
import NotificationHost from "@/components/ui/NotificationHost"
import ModalPortal from "@/components/ui/ModalPortal"
import { usePushNotifications } from "@/hooks/usePushNotifications"
import { consumeInventoryImportSuccess } from "@/lib/inventoryImportSuccess"
import { makeSpareCodeKey } from "@/lib/inventoryImportNormalize"
import AddSpareModal from "./AddSpareModal"
import EditStockModal from "./EditStockModal"
import SparePartsTable from "./SparePartsTable"
import InventorySingleSelect from "../components/InventorySingleSelect"
import { createSpare, deleteSpare, getSpares, getSuppliers, updateSpare, updateSpareStock } from "../../../services/spareService"
import LoadingButton from "../../../components/ui/LoadingButton"
import InventoryPageShell from "../components/InventoryPageShell"
import InventoryToolbarSelect from "../components/InventoryToolbarSelect"
import { INVENTORY_PAGE_SIZE_OPTIONS } from "../components/InventoryTablePager"

type Supplier = { id: string; name: string }

type SpareApiRow = {
  id: string
  spare_code: string
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
  spare_code: string
  name: string
  category: string | null
  supplierName: string
  unit: string | null
  stock_quantity: number
  min_stock: number
  cost_price: number
}

const ROW_SIZE_OPTIONS = INVENTORY_PAGE_SIZE_OPTIONS

const DEFAULT_SPARE_CATEGORIES = ["Panels", "Inverters", "Batteries", "Cables", "Mounting", "Accessories"]

function getSupplierName(value: SpareApiRow["suppliers"]) {
  if (!value) return "-"
  if (Array.isArray(value)) return value[0]?.name ?? "-"
  return value.name ?? "-"
}

export default function SparePartsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { notifications, notify, dismiss } = usePushNotifications()
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
  const [categoryFilter, setCategoryFilter] = useState("")
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [message, setMessage] = useState("")
  const [highlightedSpareCodes, setHighlightedSpareCodes] = useState<string[]>([])
  const importSuccess = searchParams.get('updated') === 'true'
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [pageSize, totalCount])

  const categorySelectOptions = useMemo(() => {
    const merged = [
      ...new Set([...DEFAULT_SPARE_CATEGORIES, ...categoryOptions].map((value) => value.trim()).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b))

    return [
      { label: "All categories", value: "" },
      ...merged.map((category) => ({ label: category, value: category })),
    ]
  }, [categoryOptions])

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
      category: categoryFilter.trim() || undefined
    })
    if (!error) {
      const mapped = (data as SpareApiRow[]).map((row) => ({
        id: row.id,
        spare_code: row.spare_code,
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
  }, [categoryFilter, debouncedSearch, page, pageSize])

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

    const payload = consumeInventoryImportSuccess()
    if (!payload) return

    notify({
      type: "success",
      title: "Import complete",
      description: `${payload.updatedRows} updated · ${payload.newRows} added`,
      duration: 6000
    })
    setHighlightedSpareCodes(payload.spareCodes.map(makeSpareCodeKey))
    queueMicrotask(() => {
      void loadSpares()
    })

    const timer = window.setTimeout(() => {
      setHighlightedSpareCodes([])
    }, 3000)

    router.replace("/inventory?tab=spares", { scroll: false })

    return () => {
      window.clearTimeout(timer)
    }
  }, [importSuccess, loadSpares, notify, router])

  useEffect(() => {
    queueMicrotask(() => {
      void loadSuppliers()
    })
  }, [loadSuppliers])

  useEffect(() => {
    let active = true
    void (async () => {
      const { data } = await getSpares({ page: 1, pageSize: 200 })
      if (!active) return
      const categories = [
        ...new Set(
          ((data as SpareApiRow[]) ?? [])
            .map((row) => row.category?.trim())
            .filter((value): value is string => Boolean(value))
        ),
      ].sort((a, b) => a.localeCompare(b))
      setCategoryOptions(categories)
    })()
    return () => {
      active = false
    }
  }, [])

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

  const handlePageSizeChange = useCallback(
    (nextPageSize: number) => {
      setPageSize(nextPageSize)
      setPage(1)
    },
    []
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
    <InventoryPageShell contentOnly>
      <NotificationHost notifications={notifications} onDismiss={dismiss} />

      {message ? (
        <div className="inv-inline-alert inv-inline-alert--success" role="status">
          {message}
        </div>
      ) : null}

      <section className="inv-spares-toolbar">
        <div className="inv-spares-toolbar-bar">
          <label className="search-input-wrapper inv-spares-search">
            <Search className="search-input-icon" />
            <input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value)
                setPage(1)
              }}
              placeholder="Search SKU or name..."
              aria-label="Search spare parts"
              className="search-input inv-spares-search-input pr-9"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("")
                  setDebouncedSearch("")
                  setPage(1)
                }}
                className="absolute right-3 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-[var(--inv-secondary)] transition hover:bg-[var(--hover)]"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>

          <div className="inv-spares-toolbar-secondary">
            <InventoryToolbarSelect
              inputId="spare-category-filter"
              className="inv-spares-category-select"
              ariaLabel="Filter spare parts by category"
              placeholder="All categories"
              value={categoryFilter}
              options={categorySelectOptions}
              onChange={(value) => {
                setCategoryFilter(value)
                setPage(1)
              }}
            />

            <button type="button" onClick={() => setModalOpen(true)} className="inv-spares-add-btn">
              <span className="inv-spares-add-btn-icon inv-action-btn-icon" aria-hidden="true">
                <PackagePlus className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="inv-spares-add-btn-label">Add Spare</span>
            </button>
          </div>
        </div>
      </section>

      <div className="page-content">
        <SparePartsTable
          rows={rows}
          highlightedSpareCodes={highlightedSpareCodes}
          loading={loading}
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
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

      <AddSpareModal
        open={modalOpen}
        loading={submitting}
        suppliers={suppliers}
        categoryOptions={categoryOptions}
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
              if (payload.category) {
                setCategoryOptions((current) =>
                  [...new Set([...current, payload.category!])].sort((a, b) => a.localeCompare(b))
                )
              }
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

      <ModalPortal isOpen={editDetailsModalOpen && Boolean(selectedSpareForEdit)} onClose={() => setEditDetailsModalOpen(false)}>
        <div className="card relative z-10 w-full max-w-xl p-5 shadow-2xl">
          <h3 className="text-lg font-semibold text-slate-900">Edit Spare</h3>
          <p className="mt-1 text-sm text-slate-600">Update settings for {selectedSpareForEdit?.name}.</p>

          <div className="mt-4 space-y-4">
            <InventorySingleSelect
              inputId="edit-spare-category"
              label="Category"
              placeholder="Select or type a category"
              value={editCategory}
              onChange={setEditCategory}
              options={categoryOptions.map((category) => ({ label: category, value: category }))}
              creatable
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={editUnit}
              onChange={(event) => setEditUnit(event.target.value)}
              placeholder="Unit"
              className="input"
            />
            <input
              type="number"
              min={0}
              value={editMinStock}
              onChange={(event) => setEditMinStock(event.target.value)}
              placeholder="Min stock"
              className="input"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={editCostPrice}
              onChange={(event) => setEditCostPrice(event.target.value)}
              placeholder="Cost price"
              className="input"
            />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditDetailsModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <LoadingButton
              type="button"
              loading={Boolean(editingSpareId)}
              loadingLabel="Saving..."
              onClick={handleSaveEditDetails}
              className="btn btn-primary"
            >
              Save changes
            </LoadingButton>
          </div>
        </div>
      </ModalPortal>

      <ModalPortal isOpen={detailsModalOpen && Boolean(selectedSpareForDetails)} onClose={() => setDetailsModalOpen(false)}>
        <div className="card relative z-10 w-full max-w-lg p-5 shadow-2xl">
          <h3 className="text-lg font-semibold text-slate-900">Spare Details</h3>
          <p className="mt-1 text-sm text-slate-600">Quick business view for {selectedSpareForDetails?.name}.</p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Category</p>
              <p className="mt-1 font-medium text-slate-900">{selectedSpareForDetails?.category || "-"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Supplier</p>
              <p className="mt-1 font-medium text-slate-900">{selectedSpareForDetails?.supplierName || "-"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Stock</p>
              <p className="mt-1 font-medium text-slate-900">{selectedSpareForDetails?.stock_quantity}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Inventory value</p>
              <p className="mt-1 font-medium text-slate-900">
                {selectedSpareForDetails ? formatCurrency(selectedSpareForDetails.stock_quantity * selectedSpareForDetails.cost_price) : "-"}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDetailsModalOpen(false)}
              className="btn btn-secondary"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setDetailsModalOpen(false)
                if (selectedSpareForDetails) {
                  setSelectedSpareForStockEdit(selectedSpareForDetails)
                  setEditStockModalOpen(true)
                }
              }}
              className="btn btn-primary"
            >
              Update stock
            </button>
          </div>
        </div>
      </ModalPortal>
    </InventoryPageShell>
  )
}
