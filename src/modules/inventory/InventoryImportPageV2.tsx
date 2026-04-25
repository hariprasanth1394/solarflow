'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  CheckCircle,
  Download,
  Eye,
  FileUp,
  Loader,
  Plus,
  Trash2,
  X,
  ChevronDown,
  BarChart3
} from 'lucide-react'
import SuccessScreen from './components/SuccessScreen'
import ErrorScreen from './components/ErrorScreen'
import SystemAvailabilityDisplay from './components/SystemAvailabilityDisplay'
import ImportLogsView from './components/ImportLogsView'
import { supabase } from '@/lib/supabaseClient'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

type ImportScreen = 'upload' | 'preview' | 'impact' | 'success' | 'error' | 'logs'
type ValidationStatus = 'idle' | 'uploading' | 'validating' | 'previewing' | 'processing' | 'completed'
type ImportStatus = 'NEW' | 'UPDATED' | 'UNCHANGED' | 'ERROR'

interface ImportRow {
  itemCode: string
  itemName: string
  systemCode: string
  systemName: string
  currentStock: number
  issuedQty: number | null
  closingStock: number | null
  unitCost: number
  totalValue: number
  rowNumber: number
  errors: any[]
  warnings: any[]
  dbCurrentStock?: number
  importedStock?: number
  difference?: number
  importStatus?: ImportStatus
}

interface SummaryStats {
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
}

interface SystemAvailabilityData {
  systemId: string
  systemName: string
  canBuild: number
  status: 'available' | 'limited' | 'unavailable'
  shortageDetected: boolean
  missingComponents?: Array<{
    spareName: string
    required: number
    available: number
    shortage: number
  }>
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function InventoryImportPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  
  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          router.push('/login')
          return
        }
        
        setIsAuthenticated(true)
      } catch (err) {
        console.error('Auth check failed:', err)
        router.push('/login')
      } finally {
        setAuthChecking(false)
      }
    }
    
    checkAuth()
  }, [router])

  // State Management
  const [screen, setScreen] = useState<ImportScreen>('upload')
  const [status, setStatus] = useState<ValidationStatus>('idle')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [summary, setSummary] = useState<SummaryStats>({
    totalRows: 0,
    validRows: 0,
    errorRows: 0,
    warningRows: 0
  })
  const [systemAvailability, setSystemAvailability] = useState<SystemAvailabilityData[]>([])
  const [batchId, setBatchId] = useState<string | null>(null)
  const [fileHash, setFileHash] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<any>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})
  const [showOnlyChanged, setShowOnlyChanged] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  const [validated, setValidated] = useState(false)

  // Show loading while checking auth
  if (authChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your session...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (redirect already happened in useEffect)
  if (!isAuthenticated) {
    return null
  }

  const parseApiPayload = async (response: Response) => {
    const raw = await response.text()
    if (!raw) return null

    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  const handleDownloadTemplate = async () => {
    setError(null)

    try {
      const response = await fetch('/api/inventory/import/sample-template')

      if (response.status === 401) {
        router.push('/login?redirect=%2Finventory')
        return
      }

      const contentType = response.headers.get('content-type') || ''
      const isExcel = contentType.includes('spreadsheetml.sheet') || contentType.includes('application/octet-stream')

      if (!response.ok || !isExcel) {
        const payload = await parseApiPayload(response)
        setError(payload?.error?.message || 'Failed to download template file')
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'inventory-import-real-sample.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Failed to download template file')
    }
  }

  // ============================================================
  // FILE UPLOAD HANDLER
  // ============================================================

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx')) {
      setError('Only .xlsx files are supported')
      return
    }

    setStatus('uploading')
    setError(null)
    setScreen('preview')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/inventory/import/upload', {
        method: 'POST',
        body: formData
      })

      const data = await parseApiPayload(response)

      if (response.status === 401) {
        router.push('/login?redirect=%2Finventory')
        return
      }

      if (!response.ok) {
        throw new Error(data?.error?.message || `Upload failed (${response.status})`)
      }

      setFileName(file.name)
      setFileHash(data.data.fileHash)
      setRows(data.data.preview || [])
      setValidated(false)
      setCurrentPage(1)
      setSummary({
        totalRows: data.data.totalRows || 0,
        validRows: data.data.totalRows || 0,
        errorRows: 0,
        warningRows: 0
      })

      setStatus('previewing')
      setSuccessMessage(`File uploaded: ${data.data.totalRows} rows ready for validation`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setStatus('idle')
      setScreen('upload')
    }
  }

  // ============================================================
  // VALIDATE HANDLER
  // ============================================================

  const handleValidate = async () => {
    setStatus('validating')
    setError(null)

    try {
      const response = await fetch('/api/inventory/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileHash, rows })
      })

      const data = await parseApiPayload(response)

      if (response.status === 401) {
        router.push('/login?redirect=%2Finventory')
        return
      }

      if (!response.ok) {
        setErrorDetails(data)
        setError(data?.error?.message || `Validation failed (${response.status})`)
        setScreen('error')
        setStatus('previewing')
        return
      }

      const report = data?.data?.validationReport
      const validatedRows = data?.data?.rows || []

      setBatchId(data.data.batchId)
      setRows(validatedRows)
      setValidated(true)
      setCurrentPage(1)
      setStatus('previewing')

      setSummary({
        totalRows: report?.totalRows || validatedRows.length,
        validRows: report?.totalRows - (report?.errorCount || 0),
        errorRows: report?.errorCount || 0,
        warningRows: report?.warningCount || 0
      })

      if (report?.hasBlockingErrors) {
        setError('Validation found errors. Fix highlighted rows before continuing.')
        setSuccessMessage(
          `Rows: ${report.totalRows} | New: ${report.newRows || 0} | Updated: ${report.updatedRows || 0} | Unchanged: ${report.unchangedRows || 0} | Errors: ${report.errorCount || 0}`
        )
        return
      }

      // Check for warnings
      if (data.error?.code === 'VALIDATION_WITH_WARNINGS') {
        setSuccessMessage(`Validation passed with ${data.validationWarnings?.length || 0} warnings`)
      } else {
        setSuccessMessage(
          `Validation successful | New: ${report?.newRows || 0} | Updated: ${report?.updatedRows || 0} | Unchanged: ${report?.unchangedRows || 0}`
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
      setStatus('previewing')
    }
  }

  // ============================================================
  // CALCULATE SYSTEM AVAILABILITY
  // ============================================================

  const handleCalculateAvailability = async () => {
    // Simulate API call to get system availability
    try {
      const response = await fetch('/api/inventory/import/system-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          rows: rows.map((r) => ({
            itemCode: r.itemCode,
            itemName: r.itemName,
            systemCode: r.systemCode,
            currentStock: r.currentStock,
            issuedQty: r.issuedQty || 0,
            closingStock: r.closingStock || r.currentStock
          }))
        })
      })

      if (response.status === 401) {
        router.push('/login?redirect=%2Finventory')
        return
      }

      if (response.ok) {
        const data = await parseApiPayload(response)
        setSystemAvailability(data?.data?.systemsAvailability || [])
      }
    } catch (err) {
      console.error('Failed to calculate system availability:', err)
    }
  }

  // ============================================================
  // EDIT HANDLER (Inline editing)
  // ============================================================

  const handleRowEdit = (rowIndex: number, field: string, value: any) => {
    const updatedRows = [...rows]
    const row = updatedRows[rowIndex]

    if (field === 'issuedQty') {
      row.issuedQty = value
      if (value !== null && value !== '') {
        row.closingStock = row.currentStock - parseFloat(value)
      }
    } else if (field === 'closingStock') {
      row.closingStock = value
      if (value !== null && value !== '') {
        row.issuedQty = row.currentStock - parseFloat(value)
      }
    }

    // Re-validate row
    row.errors = []
    row.warnings = []

    if (row.issuedQty !== null && row.issuedQty < 0) {
      row.errors.push({ column: 'Issued Qty', message: 'Cannot be negative' })
    }

    if (row.closingStock !== null && row.closingStock < 0) {
      row.errors.push({ column: 'Closing Stock', message: 'Cannot be negative' })
    }

    if (row.issuedQty !== null && row.issuedQty > row.currentStock) {
      row.errors.push({ column: 'Issued Qty', message: 'Cannot exceed current stock' })
    }

    setRows(updatedRows)
    setValidated(false)
    updateSummary(updatedRows)
  }

  // ============================================================
  // SUMMARY UPDATE
  // ============================================================

  const updateSummary = (updatedRows: ImportRow[]) => {
    const validRows = updatedRows.filter((r) => r.errors.length === 0).length
    const errorRows = updatedRows.filter((r) => r.errors.length > 0).length
    const warningRows = updatedRows.filter((r) => r.warnings.length > 0 && r.errors.length === 0).length

    setSummary({
      totalRows: updatedRows.length,
      validRows,
      errorRows,
      warningRows
    })
  }

  // ============================================================
  // CONFIRM & PROCESS
  // ============================================================

  const handleConfirmImport = async () => {
    const hasErrors = rows.some((r) => r.errors.length > 0)
    if (hasErrors) {
      setError('Please fix all errors before confirming')
      return
    }

    setStatus('processing')
    setError(null)

    try {
      const response = await fetch('/api/inventory/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, rows })
      })

      if (response.status === 401) {
        router.push('/login?redirect=%2Finventory')
        return
      }

      if (!response.ok) {
        const errorData = await parseApiPayload(response)
        setError(errorData?.error?.message || `Processing failed (${response.status})`)
        setScreen('error')
        setStatus('previewing')
        return
      }

      await parseApiPayload(response)
      setStatus('completed')
      setScreen('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed')
      setStatus('previewing')
    }
  }

  // ============================================================
  // RENDER SCREENS
  // ============================================================

  // UPLOAD SCREEN
  if (screen === 'upload') {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Import Inventory</h1>
          <p className="text-slate-600">Upload and update stock levels in bulk using Excel</p>
        </div>

        {error && (
          <div className="card flex items-center gap-3 border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="flex-1 text-red-900">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="card border-2 border-dashed p-12">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-blue-100 p-4">
              <FileUp className="h-12 w-12 text-blue-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-900">Upload Excel File</p>
              <p className="text-slate-600">Supported format: .xlsx only</p>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary h-11 px-6">
              Select File
            </button>
            <button onClick={handleDownloadTemplate} type="button" className="btn btn-secondary h-11 px-6">
              <Download className="h-4 w-4" />
              Download Real Data Template
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
    )
  }

  // ERROR SCREEN
  if (screen === 'error' && errorDetails) {
    return (
      <ErrorScreen
        title={errorDetails.error?.message || 'Import Failed'}
        message="Please review the errors below and fix your data"
        errors={errorDetails.validationErrors || []}
        warnings={errorDetails.validationWarnings || []}
        duplicates={errorDetails.duplicates || []}
        summary={errorDetails.summary}
        onEdit={() => setScreen('preview')}
        onRetry={() => {
          setScreen('upload')
          setRows([])
          setBatchId(null)
        }}
      />
    )
  }

  // PREVIEW SCREEN
  if (screen === 'preview') {
    const filteredRows = showOnlyChanged
      ? rows.filter((row) => (row.importStatus || 'UNCHANGED') !== 'UNCHANGED')
      : rows
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
    const safePage = Math.min(currentPage, totalPages)
    const paginatedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)

    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Import Preview</h1>
            <p className="text-slate-600">{fileName}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setScreen('logs')}
              className="btn btn-secondary"
            >
              <BarChart3 className="h-4 w-4" />
              View Logs
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="card flex items-center gap-3 border-green-200 bg-green-50 p-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="flex-1 text-green-900">{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* SUMMARY PANEL */}
        <div className="card sticky top-0 z-10 grid grid-cols-4 gap-4 p-4 shadow">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-2xl font-bold text-slate-900">{summary.totalRows}</p>
            <p className="text-sm text-slate-600">Total Rows</p>
          </div>
          <div className="card bg-green-50 p-3">
            <p className="text-2xl font-bold text-green-600">{summary.validRows}</p>
            <p className="text-sm text-slate-600">Valid</p>
          </div>
          <div className="card bg-red-50 p-3">
            <p className="text-2xl font-bold text-red-600">{summary.errorRows}</p>
            <p className="text-sm text-slate-600">Errors</p>
          </div>
          <div className="rounded-lg bg-yellow-50 p-3">
            <p className="text-2xl font-bold text-yellow-600">{summary.warningRows}</p>
            <p className="text-sm text-slate-600">Warnings</p>
          </div>
        </div>

        <div className="card flex items-center justify-between p-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showOnlyChanged}
              onChange={(e) => {
                setShowOnlyChanged(e.target.checked)
                setCurrentPage(1)
              }}
            />
            Show only changed rows
          </label>
          <p className="text-xs text-slate-600">
            Showing {paginatedRows.length} of {filteredRows.length} rows (Page {safePage}/{totalPages})
          </p>
        </div>

        {/* DATA TABLE */}
        <div className="table-shell overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Item</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">System</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Current (DB)</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Imported</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Diff</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Issued</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Closing</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, idx) => {
                const originalIndex = (safePage - 1) * pageSize + idx
                const rowStatus = row.importStatus || (row.errors.length > 0 ? 'ERROR' : 'UNCHANGED')
                const bgColor =
                  rowStatus === 'ERROR'
                    ? 'bg-red-50'
                    : rowStatus === 'UPDATED'
                      ? 'bg-yellow-50'
                      : rowStatus === 'NEW'
                        ? 'bg-blue-50'
                        : 'bg-green-50'
                const isExpanded = expandedRows[idx]

                return (
                  <React.Fragment key={`${row.rowNumber}-${idx}`}>
                    <tr className={`border-b border-slate-200 ${bgColor}`}>
                      <td className="px-4 py-3 font-mono text-sm text-slate-900">{row.itemCode}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{row.systemCode}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-900">{row.dbCurrentStock ?? row.currentStock}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-900">{row.importedStock ?? row.closingStock ?? row.currentStock}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-900">{row.difference ?? 0}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={row.issuedQty ?? ''}
                          onChange={(e) => handleRowEdit(originalIndex, 'issuedQty', e.target.value ? parseFloat(e.target.value) : null)}
                          className="input h-8 px-2 py-1 text-right"
                          disabled={rowStatus === 'ERROR'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={row.closingStock ?? ''}
                          onChange={(e) => handleRowEdit(originalIndex, 'closingStock', e.target.value ? parseFloat(e.target.value) : null)}
                          className="input h-8 px-2 py-1 text-right"
                          disabled={rowStatus === 'ERROR'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedRows({ ...expandedRows, [idx]: !isExpanded })}
                          className="flex items-center gap-2"
                        >
                          {rowStatus === 'ERROR' && <AlertCircle className="h-5 w-5 text-red-600" />}
                          {rowStatus === 'UPDATED' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                          {rowStatus === 'NEW' && <Plus className="h-5 w-5 text-blue-600" />}
                          {rowStatus === 'UNCHANGED' && <CheckCircle className="h-5 w-5 text-green-600" />}
                          <span className="text-xs font-semibold text-slate-600">{rowStatus}</span>
                          {(row.errors.length > 0 || row.warnings.length > 0) && (
                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          )}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (row.errors.length > 0 || row.warnings.length > 0) && (
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <td colSpan={9} className="px-4 py-3">
                          <div className="space-y-1">
                            {row.errors.map((err, i) => (
                              <p key={i} className="text-xs text-red-600">
                                <strong>Error:</strong> {err.message}
                              </p>
                            ))}
                            {row.warnings.map((warn, i) => (
                              <p key={i} className="text-xs text-yellow-600">
                                <strong>Warning:</strong> {warn.message}
                              </p>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="btn btn-secondary btn-compact disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="btn btn-secondary btn-compact disabled:opacity-50"
          >
            Next
          </button>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3">
          <button
            onClick={() => setScreen('upload')}
            className="btn btn-secondary"
          >
            Upload Different File
          </button>
          <button
            onClick={() => {
              if (validated) {
                setScreen('impact')
                return
              }
              void handleValidate()
            }}
            disabled={summary.errorRows > 0 || status === 'validating'}
            className="btn btn-primary ml-auto disabled:opacity-50"
          >
            {status === 'validating' ? (
              <>
                <Loader className="mr-2 inline h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              validated ? 'Continue to Impact' : 'Validate & Continue'
            )}
          </button>
        </div>
      </div>
    )
  }

  // IMPACT SCREEN
  if (screen === 'impact') {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">System Availability Impact</h1>
          <p className="text-slate-600">Review how this import affects your production capacity</p>
        </div>

        {status === 'validating' && (
          <div className="card flex items-center justify-center gap-3 bg-blue-50 p-8">
            <Loader className="h-5 w-5 animate-spin text-blue-600" />
            <p className="text-blue-700">Calculating system availability...</p>
          </div>
        )}

        {systemAvailability.length > 0 ? (
          <>
            <SystemAvailabilityDisplay systemsAvailability={systemAvailability} />
            <div className="flex gap-3">
              <button
                onClick={() => setScreen('preview')}
                className="btn btn-secondary"
              >
                Back to Preview
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={status === 'processing'}
                className="btn btn-primary ml-auto disabled:opacity-50"
              >
                {status === 'processing' ? (
                  <>
                    <Loader className="mr-2 inline h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm & Update Inventory'
                )}
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={handleCalculateAvailability}
            className="btn btn-primary"
          >
            Calculate Availability
          </button>
        )}
      </div>
    )
  }

  // SUCCESS SCREEN
  if (screen === 'success') {
    return (
      <SuccessScreen
        summary={{
          totalRows: summary.totalRows,
          successfulRows: summary.validRows,
          failedRows: summary.errorRows,
          timestamp: new Date().toISOString(),
          processingTimeMs: 5000
        }}
        stockMovement={{
          totalItemsAffected: summary.totalRows,
          totalQuantityIssued: rows.reduce((sum, r) => sum + (r.issuedQty || 0), 0),
          totalValueIssued: rows.reduce((sum, r) => sum + r.totalValue, 0),
          transactionCount: summary.validRows
        }}
        systemImpact={{
          systemsAffected: [...new Set(rows.map((r) => r.systemCode))],
          availabilityReduction: systemAvailability
            .filter((s) => s.status !== 'available')
            .map((s) => ({
              systemId: s.systemId,
              systemName: s.systemName,
              beforeAvailable: 10,
              afterAvailable: s.canBuild,
              reduction: 10 - s.canBuild
            }))
        }}
        batchId={batchId || ''}
        onDownloadReport={() => alert('Download functionality would be implemented')}
        onViewLogs={() => setScreen('logs')}
        onNewImport={() => {
          setScreen('upload')
          setRows([])
          setBatchId(null)
          setSummary({ totalRows: 0, validRows: 0, errorRows: 0, warningRows: 0 })
        }}
      />
    )
  }

  // LOGS SCREEN
  if (screen === 'logs') {
    return (
      <ImportLogsView
        batches={
          batchId
            ? [
                {
                  id: batchId,
                  createdAt: new Date().toISOString(),
                  completedAt: new Date().toISOString(),
                  status: 'completed',
                  fileName: fileName || 'import.xlsx',
                  totalRows: summary.totalRows,
                  validRows: summary.validRows,
                  errorRows: summary.errorRows,
                  warningRows: summary.warningRows,
                  uploadedBy: 'Current User'
                }
              ]
            : []
        }
      />
    )
  }

  return null
}
