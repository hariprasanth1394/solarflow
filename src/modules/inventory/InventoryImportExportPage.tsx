'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import AppSpinner from '@/components/ui/AppSpinner'
import { useRouter } from 'next/navigation'
import FileUploadDropzone from './components/FileUploadDropzone'
import PreviewTable from './components/PreviewTable'
import ImportWorkflowHeader from './components/ImportWorkflowHeader'
import ImportSummaryBar from './components/ImportSummaryBar'
import ImportProcessingOverlay from './components/ImportProcessingOverlay'
import ImportGuideRail from './components/ImportGuideRail'
import InventoryPageShell from './components/InventoryPageShell'
import InventoryActionCard from './components/InventoryActionCard'
import OperationsHistoryTable from './components/OperationsHistoryTable'
import NotificationHost from '@/components/ui/NotificationHost'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Download, FileSpreadsheet, Info, RotateCcw, Upload } from 'lucide-react'
import { persistInventoryImportSuccess } from '@/lib/inventoryImportSuccess'
import { makeSpareCodeKey } from '@/lib/inventoryImportNormalize'

const MultiSelectDropdown = dynamic(() => import('./components/MultiSelectDropdown'), {
  ssr: false
})

const IMPORT_STEPS = [
  {
    title: 'Export template',
    detail: 'Download your spare parts list as Excel.',
    icon: Download,
  },
  {
    title: 'Edit Final Stock',
    detail: 'Update quantities only — spare codes must stay the same.',
    icon: FileSpreadsheet,
  },
  {
    title: 'Upload & validate',
    detail: 'Upload the file below, review changes, then apply.',
    icon: Upload,
  },
] as const

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

export default function InventoryImportExportPage() {
  const router = useRouter()
  const { notifications, notify, dismiss } = usePushNotifications()
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
  const [showOnlyChanged, setShowOnlyChanged] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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
        notify({
          type: 'error',
          title: 'Could not load filters',
          description: payload?.error?.message || 'Try refreshing the page.'
        })
        setCategories([])
        setSystems([])
        setCombinations([])
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

  const liveReviewCounts = useMemo(
    () => ({
      totalRows: rows.length,
      newRows: rows.filter((row) => row.status === 'NEW').length,
      updatedRows: rows.filter((row) => row.status === 'UPDATE').length,
      unchangedRows: rows.filter((row) => row.status === 'NO CHANGE').length,
      errorRows: rows.filter((row) => row.status === 'ERROR').length,
      hasBlockingErrors: rows.some((row) => row.status === 'ERROR')
    }),
    [rows]
  )

  const reviewCounts = summary ? liveReviewCounts : null

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

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)
  const hasReviewChanges = !!reviewCounts && (reviewCounts.newRows > 0 || reviewCounts.updatedRows > 0)
  const canConfirmImport = !!reviewCounts && !reviewCounts.hasBlockingErrors && hasReviewChanges

  const isImportReviewReady = workflow === 'import' && !!summary
  const steps = workflow === 'export'
    ? ['Filters', 'Download']
    : workflow === 'import'
      ? ['Upload file', 'Review changes']
      : []
  const [exportSucceeded, setExportSucceeded] = useState(false)

  const exportTemplate = async () => {
    const query = new URLSearchParams()
    if (selectedCategories.length) query.set('categoryIds', selectedCategories.join(','))
    if (selectedSystems.length) query.set('systemIds', selectedSystems.join(','))

    setNoDataForSelection(false)
    setExporting(true)
    setExportSucceeded(false)

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

      setExportSucceeded(true)
      notify({
        type: 'success',
        title: 'Export complete',
        description: 'Your inventory snapshot has been saved to your downloads folder.'
      })
    } catch (err) {
      const failureMessage = err instanceof Error ? err.message : 'Export failed'
      if (failureMessage.toLowerCase().includes('no data available')) {
        setNoDataForSelection(true)
        notify({
          type: 'warning',
          title: 'No matching records',
          description: 'Broaden your filter criteria or clear filters to export the full inventory.'
        })
      } else {
        notify({
          type: 'error',
          title: 'Export failed',
          description: failureMessage
        })
      }
    } finally {
      setExporting(false)
    }
  }

  const currentStep = workflow === 'export'
    ? (exportSucceeded ? 2 : 1)
    : workflow === 'import'
      ? (isImportReviewReady ? 2 : 1)
      : 1

  const onFileChange = (file: File | null) => {
    setSelectedFile(file)
    setFileName(file?.name || '')
    setRows([])
    setSummary(null)
    setPage(1)
  }

  const validateFile = async () => {
    if (!selectedFile) {
      notify({
        type: 'warning',
        title: 'File required',
        description: 'Select a spreadsheet before running validation.'
      })
      return
    }

    setUploading(true)

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
      const nextSummary = {
        totalRows: mappedRows.length,
        newRows: mappedRows.filter((row: PreviewRow) => row.status === 'NEW').length,
        updatedRows: mappedRows.filter((row: PreviewRow) => row.status === 'UPDATE').length,
        unchangedRows: mappedRows.filter((row: PreviewRow) => row.status === 'NO CHANGE').length,
        errorRows: mappedRows.filter((row: PreviewRow) => row.status === 'ERROR').length,
        hasBlockingErrors: mappedRows.some((row: PreviewRow) => row.status === 'ERROR')
      }

      setSummary(nextSummary)
      setShowOnlyChanged(nextSummary.newRows + nextSummary.updatedRows > 0)
      setPage(1)
      setPageSize(10)

      if (nextSummary.hasBlockingErrors) {
        notify({
          type: 'error',
          title: 'Validation errors found',
          description: `${nextSummary.errorRows} row${nextSummary.errorRows === 1 ? '' : 's'} must be corrected before import can proceed.`
        })
      } else if (nextSummary.newRows + nextSummary.updatedRows === 0) {
        notify({
          type: 'warning',
          title: 'No changes detected',
          description: 'Update Final Stock in your spreadsheet, then run validation again.'
        })
      } else {
        notify({
          type: 'success',
          title: 'Validation successful',
          description: `${nextSummary.updatedRows + nextSummary.newRows} adjustment${nextSummary.updatedRows + nextSummary.newRows === 1 ? '' : 's'} ready for review.`
        })
      }
    } catch (err) {
      notify({
        type: 'error',
        title: 'Validation failed',
        description: err instanceof Error ? err.message : 'Unable to read this file.'
      })
    } finally {
      setUploading(false)
    }
  }

  const updateImportedStock = (rowNumber: number, value: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.rowNumber !== rowNumber) return row

        const numeric = value === '' ? 0 : Number(value)
        const importedStock = Number.isNaN(numeric) ? row.importedStock : numeric
        const difference = importedStock - row.currentStock

        return {
          ...row,
          importedStock,
          difference,
          status: row.errors.length > 0
            ? 'ERROR'
            : !row.spareCode
              ? 'NEW'
              : Math.abs(difference) > 0.01
                ? 'UPDATE'
                : 'NO CHANGE'
        }
      })
    )
  }

  const updateAdjustmentReason = (rowNumber: number, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.rowNumber === rowNumber ? { ...row, adjustmentReason: value || null } : row))
    )
  }

  const restartImportUpload = () => {
    clearFile()
    clearValidationState()
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

  const startImportWorkflow = () => {
    setWorkflow('import')
    clearFile()
    clearValidationState()
  }

  const confirmImport = async () => {
    if (!rows.length) return

    setConfirming(true)

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

      persistInventoryImportSuccess({
        updatedRows,
        newRows: insertedRows,
        errorRows: errorCount,
        spareCodes: affectedSpareCodes
      })

      resetImportFlow()
      router.push('/inventory?tab=spares&updated=true')
    } catch (err) {
      notify({
        type: 'error',
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Changes could not be applied.'
      })
    } finally {
      setConfirming(false)
    }
  }

  return (
    <InventoryPageShell contentOnly>
      <div className="inv-import-export-page">
      <NotificationHost notifications={notifications} onDismiss={dismiss} />

      {workflow === null ? (
        <>
          <div className="inv-action-grid">
            <InventoryActionCard
              title="Import inventory"
              description="Bulk-update spare stock from Excel. Every change is validated before it goes live."
              icon={Upload}
              tone="import"
              action={
                <div className="inv-action-card-panel">
                  <ImportGuideRail steps={[...IMPORT_STEPS]} variant="card" />
                  <button type="button" onClick={startImportWorkflow} className="btn btn-primary inv-action-card-primary-btn">
                    Begin import
                  </button>
                </div>
              }
            />
            <InventoryActionCard
              title="Export data"
              description="Generate inventory snapshots for offline editing, audits, or reporting."
              icon={Download}
              tone="export"
              action={
                <ul className="inv-export-options">
                  <li>
                    <button
                      type="button"
                      className="inv-export-option"
                      disabled={exporting}
                      onClick={() => void exportTemplate()}
                    >
                      <span>Spares snapshot</span>
                      <span className="inv-export-option-tag">.csv</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="inv-export-option"
                      onClick={() => {
                        setWorkflow('export')
                        setExportSucceeded(false)
                      }}
                    >
                      <span>Systems library</span>
                      <span className="inv-export-option-tag">.csv</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="inv-export-option"
                      onClick={() => {
                        setWorkflow('export')
                        setExportSucceeded(false)
                      }}
                    >
                      <span>Customer pipeline</span>
                      <span className="inv-export-option-tag">.csv</span>
                    </button>
                  </li>
                </ul>
              }
            />
          </div>
          <section className="inv-operations-section inv-elevated-card">
            <OperationsHistoryTable />
          </section>
        </>
      ) : null}

      {workflow !== null ? (
        <div className={`inv-import-shell ${workflow === 'import' ? 'inv-import-shell--import' : 'inv-import-shell--export'}`}>
          <section className="inv-import-wizard inv-elevated-card">
            <ImportWorkflowHeader
              steps={steps}
              currentStep={currentStep}
              onBack={resetImportFlow}
            />
          </section>

          {workflow === 'export' && (
            <section className="inv-import-flow inv-elevated-card inv-import-export-panel">
              <div>
                <h2 className="inv-import-guide-title">Export configuration</h2>
                <p className="inv-import-guide-lead">Apply optional filters to narrow the export. Leave all fields empty to include the full inventory.</p>
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

              {!hasFilterData ? (
                <p className="inv-import-review-note inv-import-review-note--error">
                  No inventory rows available to export.
                </p>
              ) : null}

              {hasFilterData && visibleCombinations.length > 0 ? (
                <p className="inv-import-review-note">
                  Sample matches: {visibleCombinations.map((combo) => `${combo.categoryLabel} · ${combo.systemLabel} (${combo.rowCount})`).join(' · ')}
                </p>
              ) : null}

              <div className="inv-import-action-bar">
                <button type="button" onClick={resetImportFlow} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={exportTemplate}
                  disabled={exporting || !hasFilterData || noDataForSelection}
                  className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {exporting ? (
                    <>
                      <AppSpinner size="sm" label="Exporting" variant="onPrimary" />
                      Exporting…
                    </>
                  ) : (
                    'Download snapshot'
                  )}
                </button>
              </div>

              {exporting ? (
                <ImportProcessingOverlay
                  label="Preparing export"
                  description="Generating your inventory snapshot."
                />
              ) : null}
            </section>
          )}

          {workflow === 'import' && (
            <section className="inv-import-flow inv-elevated-card">
              {!summary ? (
                <>
                  <div className="inv-upload-stage">
                    <div className="inv-import-note" role="note">
                      <Info className="inv-import-note-icon" aria-hidden="true" />
                      <p className="inv-import-note-text">
                        Only edit <strong>Final Stock</strong> in your file. Spare codes are locked and cannot be changed.
                      </p>
                    </div>

                    <ImportGuideRail
                      steps={[...IMPORT_STEPS]}
                      variant="guide"
                      activeStepIndex={2}
                    />

                    <div className="inv-upload-dropzone-wrap">
                      <FileUploadDropzone
                        premium
                        uploading={uploading}
                        fileName={selectedFile?.name || fileName}
                        onFileSelect={onFileChange}
                      />
                    </div>
                  </div>

                  <div className="inv-import-action-bar">
                    <button type="button" onClick={resetImportFlow} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void validateFile()}
                      disabled={!selectedFile || uploading}
                      className="btn btn-primary disabled:opacity-40"
                    >
                      {uploading ? (
                        <>
                          <AppSpinner size="sm" label="Validating" variant="onPrimary" />
                          Validating…
                        </>
                      ) : (
                        'Run validation'
                      )}
                    </button>
                  </div>

                  {uploading ? (
                    <ImportProcessingOverlay
                      label="Validating file"
                      description="Matching rows against your current inventory records."
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <div className="inv-import-validated-banner">
                    <div className="inv-import-validated-main">
                      <div>
                        <p className="inv-import-validated-title">Validation complete</p>
                        <p className="inv-import-validated-file">
                          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                          <span className="truncate">{fileName || selectedFile?.name}</span>
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={restartImportUpload} className="btn btn-secondary btn-compact">
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Replace file
                    </button>
                  </div>

                  <ImportSummaryBar
                    totalRows={reviewCounts!.totalRows}
                    newRows={reviewCounts!.newRows}
                    updatedRows={reviewCounts!.updatedRows}
                    unchangedRows={reviewCounts!.unchangedRows}
                    errorRows={reviewCounts!.errorRows}
                  />

                  {reviewCounts!.hasBlockingErrors ? (
                    <p className="inv-import-review-note inv-import-review-note--error">
                      {reviewCounts!.errorRows} row{reviewCounts!.errorRows === 1 ? '' : 's'} contain errors. Correct the source file or download the error report below.
                    </p>
                  ) : null}

                  {!hasReviewChanges && !reviewCounts!.hasBlockingErrors ? (
                    <p className="inv-import-review-note">
                      No stock adjustments were detected. Update Final Stock in your file and run validation again.
                    </p>
                  ) : null}

                  <div className="inv-import-review-head">
                    <h2 className="inv-import-review-title">Change summary</h2>
                    <p className="inv-import-review-copy">
                      Review each row below. Only confirmed stock adjustments will be applied to inventory.
                    </p>
                  </div>

                  <div className="inv-import-preview-panel">
                    <PreviewTable
                      rows={visibleRows}
                      showOnlyChanged={showOnlyChanged}
                      onToggleShowOnlyChanged={(next) => {
                        setShowOnlyChanged(next)
                        setPage(1)
                      }}
                      page={safePage}
                      pageSize={pageSize}
                      totalCount={filteredRows.length}
                      onPageChange={setPage}
                      onPageSizeChange={(nextPageSize) => {
                        setPageSize(nextPageSize)
                        setPage(1)
                      }}
                      onUpdateImportedStock={updateImportedStock}
                      onUpdateAdjustmentReason={updateAdjustmentReason}
                    />
                  </div>

                  <div className="inv-import-action-bar inv-import-action-bar--review">
                    <button
                      type="button"
                      onClick={downloadErrorRows}
                      disabled={!rows.some((row) => row.status === 'ERROR')}
                      className="btn btn-secondary disabled:opacity-40"
                    >
                      Download error report
                    </button>
                    <button
                      type="button"
                      onClick={() => void confirmImport()}
                      disabled={confirming || !canConfirmImport}
                      className="btn btn-primary disabled:opacity-40"
                    >
                      {confirming ? (
                        <>
                          <AppSpinner size="sm" label="Applying changes" variant="onPrimary" />
                          Applying…
                        </>
                      ) : (
                        `Confirm ${reviewCounts!.updatedRows + reviewCounts!.newRows} change${reviewCounts!.updatedRows + reviewCounts!.newRows === 1 ? '' : 's'}`
                      )}
                    </button>
                  </div>

                  {confirming ? (
                    <ImportProcessingOverlay
                      label="Applying changes"
                      description="Committing stock adjustments to inventory."
                    />
                  ) : null}
                </>
              )}
            </section>
          )}
        </div>
      ) : null}
      </div>
    </InventoryPageShell>
  )
}
