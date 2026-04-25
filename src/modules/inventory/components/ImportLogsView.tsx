'use client'

import React from 'react'
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  ChevronDown,
  Filter
} from 'lucide-react'

interface ImportRecord {
  rowNumber: number
  data: Record<string, any>
  status: 'valid' | 'invalid' | 'warning'
  errors?: Array<{ message: string; code: string }>
  warnings?: Array<{ message: string; code: string }>
}

interface Batch {
  id: string
  createdAt: string
  completedAt?: string
  status: 'pending' | 'validated' | 'processing' | 'completed' | 'failed'
  fileName: string
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
  uploadedBy: string
  records?: ImportRecord[]
}

interface ImportLogsViewProps {
  batches: Batch[]
  onDownload?: (batchId: string) => void
  onRetry?: (batchId: string) => void
  selectedBatchId?: string | null
  onSelectBatch?: (batchId: string) => void
}

export default function ImportLogsView({
  batches,
  onDownload,
  onRetry,
  selectedBatchId = null,
  onSelectBatch
}: ImportLogsViewProps) {
  const [expandedBatchId, setExpandedBatchId] = React.useState<string | null>(selectedBatchId)
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'completed' | 'failed' | 'pending'>('all')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', label: 'Completed' }
      case 'failed':
        return { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', label: 'Failed' }
      case 'processing':
        return { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', label: 'Processing' }
      case 'validated':
        return { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', label: 'Validated' }
      default:
        return { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600', label: 'Pending' }
    }
  }

  const filteredBatches = batches.filter((batch) => {
    if (filterStatus === 'all') return true
    return batch.status === filterStatus
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getProcessingTime = (createdAt: string, completedAt?: string) => {
    const start = new Date(createdAt)
    const end = completedAt ? new Date(completedAt) : new Date()
    const diffMs = end.getTime() - start.getTime()
    const diffSecs = Math.round(diffMs / 1000)

    if (diffSecs < 60) return `${diffSecs}s`
    return `${Math.round(diffSecs / 60)}min`
  }

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Import Batch History</h1>
        <p className="text-slate-600">Review all inventory imports and their status</p>
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            filterStatus === 'all'
              ? 'bg-slate-900 text-white'
              : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          All ({batches.length})
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            filterStatus === 'completed'
              ? 'bg-green-600 text-white'
              : 'border border-green-300 text-green-700 hover:bg-green-50'
          }`}
        >
          Completed ({batches.filter((b) => b.status === 'completed').length})
        </button>
        <button
          onClick={() => setFilterStatus('failed')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            filterStatus === 'failed'
              ? 'bg-red-600 text-white'
              : 'border border-red-300 text-red-700 hover:bg-red-50'
          }`}
        >
          Failed ({batches.filter((b) => b.status === 'failed').length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            filterStatus === 'pending'
              ? 'bg-slate-600 text-white'
              : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Pending ({batches.filter((b) => b.status === 'pending').length})
        </button>
      </div>

      {/* BATCH LIST */}
      <div className="space-y-3">
        {filteredBatches.map((batch) => {
          const colors = getStatusColor(batch.status)
          const isExpanded = expandedBatchId === batch.id
          const successRate = batch.totalRows > 0 ? ((batch.validRows / batch.totalRows) * 100).toFixed(0) : 0

          return (
            <div key={batch.id} className={`rounded-lg border ${colors.border} ${colors.bg}`}>
              {/* BATCH HEADER */}
              <button
                onClick={() => {
                  setExpandedBatchId(isExpanded ? null : batch.id)
                  onSelectBatch?.(batch.id)
                }}
                className={`w-full px-6 py-4 text-left ${isExpanded ? `border-b ${colors.border}` : ''}`}
              >
                <div className="flex items-center justify-between">
                  {/* LEFT SECTION */}
                  <div className="flex flex-1 items-center gap-4">
                    {batch.status === 'completed' && <CheckCircle className={`h-5 w-5 ${colors.icon}`} />}
                    {batch.status === 'failed' && <AlertCircle className={`h-5 w-5 ${colors.icon}`} />}
                    {batch.status !== 'completed' && batch.status !== 'failed' && <Clock className={`h-5 w-5 ${colors.icon}`} />}

                    <div>
                      <p className="font-semibold text-slate-900">{batch.fileName}</p>
                      <p className="text-xs text-slate-600">
                        {formatDate(batch.createdAt)}
                        {batch.completedAt && ` • Completed in ${getProcessingTime(batch.createdAt, batch.completedAt)}`}
                      </p>
                      <p className="text-xs text-slate-600">
                        Uploaded by <strong>{batch.uploadedBy}</strong> • Batch ID: <span className="font-mono">{batch.id.slice(0, 8)}</span>
                      </p>
                    </div>
                  </div>

                  {/* RIGHT SECTION */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">{batch.totalRows}</p>
                      <p className="text-xs text-slate-600">rows</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{successRate}%</p>
                      <p className="text-xs text-slate-600">success</p>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>
              </button>

              {/* BATCH DETAILS */}
              {isExpanded && (
                <div className="space-y-4 px-6 py-4">
                  {/* STATS GRID */}
                  <div className="grid gap-2 md:grid-cols-4">
                    <div className="rounded-lg bg-white/50 p-3">
                      <p className="text-xs text-slate-600">Total Rows</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">{batch.totalRows}</p>
                    </div>
                    <div className="rounded-lg bg-white/50 p-3">
                      <p className="text-xs text-slate-600">Valid</p>
                      <p className="mt-1 text-xl font-bold text-green-600">{batch.validRows}</p>
                    </div>
                    <div className="rounded-lg bg-white/50 p-3">
                      <p className="text-xs text-slate-600">Errors</p>
                      <p className="mt-1 text-xl font-bold text-red-600">{batch.errorRows}</p>
                    </div>
                    <div className="rounded-lg bg-white/50 p-3">
                      <p className="text-xs text-slate-600">Warnings</p>
                      <p className="mt-1 text-xl font-bold text-yellow-600">{batch.warningRows}</p>
                    </div>
                  </div>

                  {/* RECORD DETAILS */}
                  {batch.records && batch.records.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-900">Row Details</p>
                      <div className="max-h-60 space-y-2 overflow-y-auto">
                        {batch.records.slice(0, 10).map((record, idx) => (
                          <div
                            key={idx}
                            className={`rounded px-3 py-2 text-xs ${
                              record.status === 'valid'
                                ? 'border border-green-200 bg-green-50'
                                : record.status === 'invalid'
                                  ? 'border border-red-200 bg-red-50'
                                  : 'border border-yellow-200 bg-yellow-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-semibold">Row {record.rowNumber}</span>
                              <span className="capitalize">{record.status}</span>
                            </div>
                            {record.errors && record.errors.length > 0 && (
                              <p className="mt-1 text-slate-700">
                                {record.errors.map((e) => e.message).join('; ')}
                              </p>
                            )}
                            {record.warnings && record.warnings.length > 0 && (
                              <p className="mt-1 text-slate-700">
                                {record.warnings.map((w) => w.message).join('; ')}
                              </p>
                            )}
                          </div>
                        ))}
                        {batch.records.length > 10 && (
                          <p className="text-center text-xs text-slate-600">
                            +{batch.records.length - 10} more rows
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="flex flex-wrap gap-2 border-t border-white/50 pt-4">
                    {onDownload && (
                      <button onClick={() => onDownload(batch.id)} className="btn btn-secondary btn-compact">
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                    )}
                    {batch.status === 'failed' && onRetry && (
                      <button onClick={() => onRetry(batch.id)} className="btn btn-primary btn-compact">
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* EMPTY STATE */}
      {filteredBatches.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-12">
          <Clock className="h-8 w-8 text-slate-400" />
          <p className="mt-2 text-slate-600">No import batches found</p>
        </div>
      )}
    </div>
  )
}
