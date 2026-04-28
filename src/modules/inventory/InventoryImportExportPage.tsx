'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import FileUploadDropzone from './components/FileUploadDropzone'
import PreviewTable from './components/PreviewTable'
import InventoryPageShell from './components/InventoryPageShell'
import { inventorySectionCardClass } from './components/inventoryTableStyles'
import Toast from '@/components/ui/Toast'
import { persistInventoryImportSuccess } from '@/lib/inventoryImportSuccess'
import { makeSpareCodeKey, normalize } from '@/lib/inventoryImportNormalize'

const MultiSelectDropdown = dynamic(() => import('./components/MultiSelectDropdown'), {
  ssr: false
})

type PreviewRow = {
  rowNumber: number
  spareCode: string
  itemName: string
  category: string
  unit: string
  currentStock: number
  importedStock: number
  difference: number
  status: 'NEW' | 'UPDATE' | 'NO CHANGE' | 'ERROR'
  errors: Array<{ column: string; message: string }>
  warnings: Array<{ column: string; message: string }>
  matchFound: boolean
  adjustmentReason?: string | null
}

type DbMatchRow = {
  spare_code: string
  current_stock: number
}

type ValidationSummary = {
  totalRows: number
  newRows: number
  updatedRows: number
  unchangedRows: number
  errorRows: number
  hasBlockingErrors: boolean
}

type WorkflowMode = 'export' | 'import'

type CategoryFilterOption = {
  id: string
  label: string
}

type SystemFilterOption = {
  id: string
  label: string
  code: string
}

type FilterCombination = {
  categoryId: string
  categoryLabel: string
  systemId: string
  systemLabel: string
  systemCode: string
  rowCount: number
}

type ToastState = {
  type: 'success' | 'error' | 'info'
  title: string
  description: string
  duration?: number
} | null

export default function InventoryImportExportPage() {
  const router = useRouter()
  const [workflow, setWorkflow] = useState<WorkflowMode | null>(null)
  const [categories, setCategories] = useState<CategoryFilterOption[]>([])
  const [systems, setSystems] = useState<SystemFilterOption[]>([])
  const [combinations, setCombinations] = useState<FilterCombination[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSystems, setSelectedSystems] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)
  const [noDataForSelection, setNoDataForSelection] = useState(false)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [fileName, setFileName] = useState('')
  const [batchKey, setBatchKey] = useState('')
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [summary, setSummary] = useState<ValidationSummary | null>(null)
  const [showOnlyChanged, setShowOnlyChanged] = useState(false)
  const [page, setPage] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), toast.duration ?? 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const showToast = (nextToast: NonNullable<ToastState>) => {
    setToast(nextToast)
  }

  const clearFile = () => {
    setSelectedFile(null)
    setFileName('')
    setBatchKey('')
  }

  const clearValidationState = () => {
    setRows([])
    setSummary(null)
    setShowOnlyChanged(false)
    setPage(1)
    setError('')
    setMessage('')
  }

  const resetImportFlow = () => {
    clearFile()
    clearValidationState()
    setWorkflow(null)
  }

  const deriveFrontendRows = (incomingRows: PreviewRow[], dbItems: DbMatchRow[] = []) => {
    const dbItemMap = new Map<string, DbMatchRow>()
    dbItems.forEach((item) => {
      dbItemMap.set(makeSpareCodeKey(item.spare_code), item)
    })

    return incomingRows.map((row) => {
      const key = makeSpareCodeKey(row.spareCode)
      const match = dbItemMap.get(key)
      const matchFound = !!match
      const currentStock = matchFound ? Number(match?.current_stock || 0) : Number(row.currentStock || 0)
      // Trust the backend-calculated difference, don't recalculate
      const difference = row.difference
      const status: PreviewRow['status'] = row.errors.length > 0 ? 'ERROR' : !row.spareCode ? 'NEW' : Math.abs(difference) > 0.01 ? 'UPDATE' : 'NO CHANGE'

      console.log('[inventory.import.frontend] row_match_check', {
        excelItem: row.spareCode,
        normalizedExcel: normalize(row.spareCode),
        matched: matchFound,
        difference,
        currentStock
      })

      return {
        ...row,
        currentStock,
        difference,
        status,
        matchFound
      }
    })
  }

  useEffect(() => {
    let active = true

    void (async () => {
      const response = await fetch('/api/inventory/v3/filters', {
        method: 'GET'
      })

      const payload = await response.json().catch(() => null)
      if (!active) return

      if (!response.ok) {
        setCategories([])
        setSystems([])
        setCombinations([])
        setError(payload?.error?.message || 'Failed to load filter options')
        return
      }

      setCategories(payload?.data?.categories || [])
      setSystems(payload?.data?.systems || [])
      setCombinations(payload?.data?.combinations || [])
    })()

    return () => {
      active = false
    }
  }, [])

  const filteredRows = useMemo(() => {
    if (!showOnlyChanged) return rows
    return rows.filter((row) => row.status !== 'NO CHANGE')
  }, [rows, showOnlyChanged])

  const availableCategoryIds = useMemo(() => {
    if (selectedSystems.length === 0) return null
    return new Set(
      combinations
        .filter((combo) => selectedSystems.includes(combo.systemId))
        .map((combo) => combo.categoryId)
    )
  }, [combinations, selectedSystems])

  const availableSystemIds = useMemo(() => {
    if (selectedCategories.length === 0) return null
    return new Set(
      combinations
        .filter((combo) => selectedCategories.includes(combo.categoryId))
        .map((combo) => combo.systemId)
    )
  }, [combinations, selectedCategories])

  const categoryOptions = useMemo(
    () => categories
      .filter((category) => !availableCategoryIds || availableCategoryIds.has(category.id))
      .map((category) => ({ label: category.label, value: category.id })),
    [categories, availableCategoryIds]
  )
  const systemOptions = useMemo(
    () => systems
      .filter((system) => !availableSystemIds || availableSystemIds.has(system.id))
      .map((system) => ({ label: `${system.label} (${system.code})`, value: system.id })),
    [systems, availableSystemIds]
  )
  const hasFilterData = categoryOptions.length > 0 || systemOptions.length > 0

  const visibleCombinations = useMemo(() => {
    const filtered = combinations.filter((combo) => {
      const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(combo.categoryId)
      const systemMatch = selectedSystems.length === 0 || selectedSystems.includes(combo.systemId)
      return categoryMatch && systemMatch
    })
    return filtered.slice(0, 8)
  }, [combinations, selectedCategories, selectedSystems])

  const pageSize = 100
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  const isImportReviewReady = workflow === 'import' && !!summary
  const steps = workflow === 'export'
    ? ['Choose workflow', 'Configure filters', 'Download file']
    : workflow === 'import'
      ? ['Choose workflow', 'Upload file', 'Review & apply']
      : ['Choose workflow']
  const currentStep = workflow === null ? 1 : workflow === 'export' ? (message ? 3 : 2) : isImportReviewReady ? 3 : 2

  const exportTemplate = async () => {
    const query = new URLSearchParams()
    if (selectedCategories.length) query.set('categoryIds', selectedCategories.join(','))
    if (selectedSystems.length) query.set('systemIds', selectedSystems.join(','))

    setError('')
    setMessage('')
    setNoDataForSelection(false)
    setExporting(true)

    try {
      const response = await fetch(`/api/inventory/v3/export?${query.toString()}`, {
        method: 'GET'
      })

      const contentType = response.headers.get('content-type') || ''

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error?.message || 'Failed to export inventory template')
      }

      if (!contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error?.message || 'Unexpected export response from server')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'inventory-export-template.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      setMessage('Export generated successfully.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export inventory template'
      if (message.toLowerCase().includes('no data available')) {
        setNoDataForSelection(true)
        setError('No matching inventory rows for the selected filters. Adjust filters or clear them and try again.')
      } else {
        setError(message)
      }
    } finally {
      setExporting(false)
    }
  }

  const onFileChange = (file: File | null) => {
    setSelectedFile(file)
    setFileName(file?.name || '')
    setRows([])
    setSummary(null)
    setPage(1)
    setError('')
    setMessage('')
  }

  const validateFile = async () => {
    if (!selectedFile) {
      setError('Please upload a file first')
      return
    }

    setUploading(true)
    setError('')
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/inventory/v3/import/validate', {
        method: 'POST',
        body: formData
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Failed to validate file')
      }

      const rawRows = payload.data.rows || []
      const dbItems = payload.data.dbItems || []
      const mappedRows = deriveFrontendRows(rawRows, dbItems)

      setFileName(payload.data.fileName)
      setBatchKey(payload.data.batchKey)
      setRows(mappedRows)
      setSummary({
        totalRows: mappedRows.length,
        newRows: mappedRows.filter((row: PreviewRow) => row.status === 'NEW').length,
        updatedRows: mappedRows.filter((row: PreviewRow) => row.status === 'UPDATE').length,
        unchangedRows: mappedRows.filter((row: PreviewRow) => row.status === 'NO CHANGE').length,
        errorRows: mappedRows.filter((row: PreviewRow) => row.status === 'ERROR').length,
        hasBlockingErrors: mappedRows.some((row: PreviewRow) => row.status === 'ERROR')
      })
      setPage(1)
      setMessage('Validation complete. Review and confirm import.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
    } finally {
      setUploading(false)
    }
  }

  const updateImportedStock = (index: number, value: string) => {
    const numeric = value === '' ? 0 : Number(value)
    const updated = [...filteredRows]
    const target = updated[index]
    if (!target) return

    target.importedStock = Number.isNaN(numeric) ? target.importedStock : numeric
    target.difference = target.importedStock - target.currentStock
    target.status = target.errors.length > 0
      ? 'ERROR'
      : !target.spareCode
        ? 'NEW'
        : Math.abs(target.difference) > 0.01
          ? 'UPDATE'
          : 'NO CHANGE'

            const byRowNumber = new Map(updated.map((row) => [row.rowNumber, row]))
            setRows((prev) => prev.map((row) => byRowNumber.get(row.rowNumber) || row))
  }

  const updateAdjustmentReason = (index: number, value: string) => {
    const updated = [...filteredRows]
    const target = updated[index]
    if (!target) return

    target.adjustmentReason = value || null

    const byRowNumber = new Map(updated.map((row) => [row.rowNumber, row]))
    setRows((prev) => prev.map((row) => byRowNumber.get(row.rowNumber) || row))
  }

  const downloadErrorRows = () => {
    const errorRows = rows.filter((row) => row.status === 'ERROR')
    if (!errorRows.length) return

    const lines = [
      'Row,Spare Code,Item Name,Errors',
      ...errorRows.map((row) => `${row.rowNumber},${row.spareCode},${row.itemName},"${row.errors.map((e) => `${e.column}: ${e.message}`).join(' | ')}"`)
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventory-import-errors.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const confirmImport = async () => {
    if (!rows.length) return

    setConfirming(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/inventory/v3/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          batchKey,
          rows: rows.map((row) => ({
            rowNumber: row.rowNumber,
            spareCode: row.spareCode,
            itemName: row.itemName,
            category: row.category,
            unit: row.unit,
            currentStock: row.currentStock,
            closingStock: row.importedStock,
            unitCost: 0,
            importStatus: row.status,
            errors: row.errors,
            adjustmentReason: row.adjustmentReason || null
          }))
        })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Failed to apply import')
      }

      const insertedRows = Number(payload?.data?.insertedRows || 0)
      const updatedRows = Number(payload?.data?.updatedRows || 0)
      const affectedSpareCodes = Array.isArray(payload?.data?.affectedSpareCodes)
        ? payload.data.affectedSpareCodes.map((value: unknown) => String(value || '').trim()).filter(Boolean)
        : []
      const errorCount = Array.isArray(payload?.data?.errors) ? payload.data.errors.length : 0

      showToast({
        type: 'success',
        title: 'Inventory Updated',
        description: `${updatedRows} updated, ${insertedRows} added`,
        duration: 4000
      })

      persistInventoryImportSuccess({
        updatedRows,
        newRows: insertedRows,
        errorRows: errorCount,
        spareCodes: affectedSpareCodes
      })

      resetImportFlow()
      router.push('/inventory/spares?updated=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm failed')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <InventoryPageShell
      title="Import / Export"
      subtitle="Run one workflow at a time to keep bulk inventory updates clear, safe, and reversible."
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              setWorkflow('export')
              setError('')
              setMessage('')
            }}
            className={workflow === 'export' ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            Export workflow
          </button>
          <button
            type="button"
            onClick={() => {
              setWorkflow('import')
              setError('')
              setMessage('')
            }}
            className={workflow === 'import' ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            Import workflow
          </button>
        </>
      }
    >
      {toast ? (
        <div className="fixed right-4 top-4 z-50 w-[min(92vw,420px)] sm:right-6 sm:top-6">
          <Toast
            title={toast.title}
            description={toast.description}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      ) : null}
      {error && <p className="card bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className={inventorySectionCardClass}>
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((stepLabel, index) => {
            const stepNo = index + 1
            const active = stepNo === currentStep
            const done = stepNo < currentStep
            return (
              <span
                key={stepLabel}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : done
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {stepNo}. {stepLabel}
              </span>
            )
          })}
        </div>
      </section>

      {workflow === null ? (
        <section className={`${inventorySectionCardClass} text-sm text-slate-600`}>
          Start by choosing Export workflow or Import workflow.
        </section>
      ) : null}

      {workflow === 'export' && (
        <section className={`${inventorySectionCardClass} space-y-4`}>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Step 2: Configure export filters</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Select category/system filters and export the latest inventory snapshot.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <MultiSelectDropdown
              label="Category"
              placeholder="Select categories"
              options={categoryOptions}
              selected={selectedCategories}
              onChange={(values) => {
                setSelectedCategories(values)
                setNoDataForSelection(false)
              }}
              helperText="Leave empty to include all categories."
            />
            <MultiSelectDropdown
              label="System"
              placeholder="Select systems"
              options={systemOptions}
              selected={selectedSystems}
              onChange={(values) => {
                setSelectedSystems(values)
                setNoDataForSelection(false)
              }}
              helperText="Leave empty to include all systems."
            />
          </div>

          {!hasFilterData && (
            <div className="card bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No exportable inventory rows found. Add stock rows linked to items and systems, then retry export.
            </div>
          )}

          {hasFilterData && (
            <div className="card px-4 py-3 text-sm text-slate-700">
              <p className="font-medium text-slate-800">Available combinations (sample):</p>
              {visibleCombinations.length > 0 ? (
                <p className="mt-1 text-slate-600">
                  {visibleCombinations.map((combo) => `${combo.categoryLabel} × ${combo.systemLabel} (${combo.rowCount})`).join(' • ')}
                </p>
              ) : (
                <p className="mt-1 text-slate-600">No combinations match current selections. Clear filters to view all combinations.</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end">
            <button type="button" onClick={exportTemplate} disabled={exporting || !hasFilterData || noDataForSelection} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-70">
              {exporting ? 'Exporting...' : 'Step 3: Download Excel'}
            </button>
          </div>
        </section>
      )}

      {workflow === 'import' && (
        <>
          <section className={`${inventorySectionCardClass} space-y-4`}>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Step 2: Upload and validate</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Upload your filled template and validate rows before any update is applied.</p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Spare Code is read-only and is the primary identifier for updates. Leave Spare Code blank only when intentionally inserting a new spare.</p>
            </div>

            <FileUploadDropzone
              uploading={uploading}
              fileName={selectedFile?.name || fileName}
              onFileSelect={onFileChange}
            />

            <div className="flex justify-end">
              <button type="button" onClick={() => void validateFile()} disabled={!selectedFile || uploading} className="btn btn-primary disabled:opacity-40">
                {uploading ? 'Validating...' : 'Validate File'}
              </button>
            </div>
          </section>

          {summary && (
            <section className={`${inventorySectionCardClass} space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Step 3: Review and apply</h3>
                  <p className="text-sm leading-6 text-slate-600">Check all row changes and confirm to apply stock updates.</p>
                </div>
                <p className="text-xs text-slate-500">{fileName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <div className="card p-4 text-sm text-slate-700">Total: <span className="font-semibold text-slate-900">{summary.totalRows}</span></div>
                <div className="card bg-blue-50 p-4 text-sm text-blue-700">New: <span className="font-semibold text-blue-900">{summary.newRows}</span></div>
                <div className="card bg-emerald-50 p-4 text-sm text-emerald-700">Update: <span className="font-semibold text-emerald-900">{summary.updatedRows}</span></div>
                <div className="card bg-slate-100 p-4 text-sm text-slate-700">No Change: <span className="font-semibold text-slate-900">{summary.unchangedRows}</span></div>
                <div className="card bg-rose-50 p-4 text-sm text-rose-700">Errors: <span className="font-semibold text-rose-900">{summary.errorRows}</span></div>
              </div>

              <PreviewTable
                rows={visibleRows}
                showOnlyChanged={showOnlyChanged}
                onToggleShowOnlyChanged={(next) => {
                  setShowOnlyChanged(next)
                  setPage(1)
                }}
                page={safePage}
                totalPages={totalPages}
                onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
                onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
                onUpdateImportedStock={updateImportedStock}
                onUpdateAdjustmentReason={updateAdjustmentReason}
              />

              <div className="flex flex-wrap gap-2">
                <button onClick={downloadErrorRows} disabled={!rows.some((row) => row.status === 'ERROR')} className="btn btn-secondary disabled:opacity-40">
                  Download Error CSV
                </button>
                <button onClick={() => void confirmImport()} disabled={confirming} className="btn btn-primary ml-auto disabled:opacity-40">
                  {confirming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Applying changes...
                    </>
                  ) : (
                    'Confirm & Apply'
                  )}
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </InventoryPageShell>
  )
}
