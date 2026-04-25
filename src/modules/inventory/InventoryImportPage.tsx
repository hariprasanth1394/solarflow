'use client'

import React, { useState, useRef } from 'react'
import {
  AlertCircle,
  CheckCircle,
  Download,
  Eye,
  FileUp,
  Loader,
  Plus,
  Trash2,

  X
} from 'lucide-react'

type ValidationStatus = 'idle' | 'uploading' | 'validating' | 'previewing' | 'confirming' | 'processing' | 'completed'

type ImportRow = {
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
}

type SummaryStats = {
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
}

export default function InventoryImportPage() {
  // State Management
  const [status, setStatus] = useState<ValidationStatus>('idle')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [summary, setSummary] = useState<SummaryStats>({
    totalRows: 0,
    validRows: 0,
    errorRows: 0,
    warningRows: 0
  })
  const [batchId, setBatchId] = useState<string | null>(null)
  const [fileHash, setFileHash] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ============================================================
  // FILE UPLOAD HANDLER
  // ============================================================

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith('.xlsx')) {
      setError('Only .xlsx files are supported')
      return
    }

    setStatus('uploading')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/inventory/import/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()

      // Store file info
      setFileName(file.name)
      setFileHash(data.data.fileHash)
      setRows(data.data.rows)
      setSummary(data.data.validationSummary)

      setStatus('previewing')
      setSuccessMessage(`File uploaded: ${data.data.validationSummary.validRows} valid rows, ${data.data.validationSummary.errorRows} errors`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setStatus('idle')
    }
  }

  // ============================================================
  // EDIT HANDLER (Inline editing)
  // ============================================================

  const handleRowEdit = (rowIndex: number, field: 'issuedQty' | 'closingStock', value: number | null) => {
    const updatedRows = [...rows]
    const row = updatedRows[rowIndex]

    // Update field
    if (field === 'issuedQty') {
      row.issuedQty = value
      if (value !== null) {
        row.closingStock = row.currentStock - value
      }
    } else if (field === 'closingStock') {
      row.closingStock = value
      if (value !== null) {
        row.issuedQty = row.currentStock - value
      }
    }

    // Re-validate row
    row.errors = []
    row.warnings = []

    if (row.issuedQty !== null && row.issuedQty < 0) {
      row.errors.push({
        column: 'Issued Qty',
        message: 'Cannot be negative'
      })
    }

    if (row.closingStock !== null && row.closingStock < 0) {
      row.errors.push({
        column: 'Closing Stock',
        message: 'Cannot be negative'
      })
    }

    if (row.issuedQty !== null && row.issuedQty > row.currentStock) {
      row.errors.push({
        column: 'Issued Qty',
        message: 'Cannot exceed current stock'
      })
    }

    setRows(updatedRows)
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
    // Check for errors
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
        body: JSON.stringify({ batchId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Processing failed')
      }

      const data = await response.json()

      setStatus('completed')
      setSuccessMessage(`Import completed: ${data.data.processedRows} rows processed`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed')
      setStatus('previewing')
    }
  }

  // ============================================================
  // RENDER UI
  // ============================================================

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Import Stock</h1>
        <p className="text-slate-600">Upload and update inventory in bulk using Excel</p>
      </div>

      {/* ERROR / SUCCESS MESSAGES */}
      {error && (
        <div className="card flex items-center gap-3 border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div className="flex-1">
            <p className="font-medium text-red-900">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="card flex items-center gap-3 border-green-200 bg-green-50 p-4">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="font-medium text-green-900">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* UPLOAD SECTION */}
      {status === 'idle' && (
        <div className="card border-2 border-dashed p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-slate-100 p-4">
              <FileUp className="h-8 w-8 text-slate-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-900">Upload Stock_Import.xlsx</p>
              <p className="text-sm text-slate-600">Drag and drop or click to select</p>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary">
              Select File
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
      )}

      {/* LOADING STATES */}
      {(status === 'uploading' || status === 'validating') && (
        <div className="card flex flex-col items-center justify-center gap-4 p-12">
          <Loader className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-slate-600">
            {status === 'uploading' ? 'Uploading file...' : 'Validating data...'}
          </p>
        </div>
      )}

      {/* PREVIEW TABLE */}
      {(status === 'previewing' || status === 'confirming') && rows.length > 0 && (
        <>
          {/* SUMMARY PANEL (Sticky) */}
          <div className="card sticky top-0 z-10 space-y-3 p-4 shadow">
            <div className="grid grid-cols-4 gap-4">
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
          </div>

          {/* DATA TABLE */}
          <div className="table-shell overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Item Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">System</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Current Stock</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Issued Qty</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Closing Stock</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const rowStatus = row.errors.length > 0 ? 'error' : row.warnings.length > 0 ? 'warning' : 'valid'
                  const bgColor = rowStatus === 'error' ? 'bg-red-50' : rowStatus === 'warning' ? 'bg-yellow-50' : 'hover:bg-slate-50'

                  return (
                    <tr key={idx} className={`border-b border-slate-200 ${bgColor}`}>
                      <td className="px-4 py-3 font-mono text-sm text-slate-900">{row.itemCode}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{row.systemCode}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-900">{row.currentStock.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={row.issuedQty ?? ''}
                          onChange={(e) =>
                            handleRowEdit(idx, 'issuedQty', e.target.value ? parseFloat(e.target.value) : null)
                          }
                          className="input h-8 px-2 py-1 text-right"
                          disabled={rowStatus === 'error'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={row.closingStock ?? ''}
                          onChange={(e) =>
                            handleRowEdit(idx, 'closingStock', e.target.value ? parseFloat(e.target.value) : null)
                          }
                          className="input h-8 px-2 py-1 text-right"
                          disabled={rowStatus === 'error'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {rowStatus === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
                          {rowStatus === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                          {rowStatus === 'valid' && <CheckCircle className="h-5 w-5 text-green-600" />}
                          <span className="text-xs font-semibold capitalize text-slate-600">{rowStatus}</span>
                        </div>
                        {row.errors.length > 0 && (
                          <p className="mt-1 text-xs text-red-600">{row.errors[0].message}</p>
                        )}
                        {row.warnings.length > 0 && (
                          <p className="mt-1 text-xs text-yellow-600">{row.warnings[0].message}</p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStatus('idle')
                setRows([])
                setSummary({ totalRows: 0, validRows: 0, errorRows: 0, warningRows: 0 })
                setBatchId(null)
              }}
              className="btn btn-secondary"
            >
              Upload Different File
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={summary.errorRows > 0}
              className="btn btn-primary ml-auto disabled:opacity-50"
            >
              {status === 'confirming' ? (
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
      )}

      {/* COMPLETION SCREEN */}
      {status === 'completed' && (
        <div className="card border-green-200 bg-green-50 p-8">
          <div className="flex flex-col items-center gap-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <h2 className="text-2xl font-bold text-green-900">Import Completed Successfully</h2>
            <p className="text-green-700">Your inventory has been updated</p>
            <button
              onClick={() => {
                setStatus('idle')
                setRows([])
                setSummary({ totalRows: 0, validRows: 0, errorRows: 0, warningRows: 0 })
                setBatchId(null)
              }}
              className="btn btn-primary"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
