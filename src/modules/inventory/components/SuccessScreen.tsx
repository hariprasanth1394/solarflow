'use client'

import React from 'react'
import {
  CheckCircle,
  Download,
  TrendingUp,
  AlertTriangle,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

interface SuccessScreenProps {
  summary: {
    totalRows: number
    successfulRows: number
    failedRows: number
    timestamp: string
    processingTimeMs: number
  }
  stockMovement: {
    totalItemsAffected: number
    totalQuantityIssued: number
    totalValueIssued: number
    transactionCount: number
  }
  systemImpact: {
    systemsAffected: string[]
    availabilityReduction: Array<{
      systemId: string
      systemName: string
      beforeAvailable: number
      afterAvailable: number
      reduction: number
    }>
  }
  batchId: string
  onDownloadReport?: () => void
  onViewLogs?: () => void
  onNewImport?: () => void
}

export default function SuccessScreen({
  summary,
  stockMovement,
  systemImpact,
  batchId,
  onDownloadReport,
  onViewLogs,
  onNewImport
}: SuccessScreenProps) {
  return (
    <div className="space-y-6 p-6">
      {/* SUCCESS CARD */}
      <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-8">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-green-900">Import Completed Successfully</h1>
            <p className="mt-1 text-green-700">
              {summary.successfulRows} inventory records have been updated
            </p>
            <p className="mt-2 text-sm text-green-600">
              Batch ID: <span className="font-mono font-semibold">{batchId}</span>
            </p>
          </div>
        </div>
      </div>

      {/* PROCESSING SUMMARY */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-600">Total Rows Processed</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{summary.totalRows}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-600">Successful</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{summary.successfulRows}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-600">Processing Time</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {(summary.processingTimeMs / 1000).toFixed(2)}s
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-600">Completed At</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {new Date(summary.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* STOCK MOVEMENT SUMMARY */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">Stock Movement Summary</h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="flex gap-3">
            <div className="rounded-lg bg-blue-50 p-3">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Items Affected</p>
              <p className="text-2xl font-bold text-slate-900">
                {stockMovement.totalItemsAffected}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="rounded-lg bg-purple-50 p-3">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Quantity Issued</p>
              <p className="text-2xl font-bold text-slate-900">
                {stockMovement.totalQuantityIssued.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="rounded-lg bg-amber-50 p-3">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Value Issued</p>
              <p className="text-2xl font-bold text-slate-900">
                ${stockMovement.totalValueIssued.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SYSTEM IMPACT */}
      {systemImpact.availabilityReduction.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-slate-900">System Availability Impact</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {systemImpact.systemsAffected.length} system(s) affected
          </p>

          <div className="mt-4 space-y-3">
            {systemImpact.availabilityReduction.map((system) => (
              <div
                key={system.systemId}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{system.systemName}</p>
                  <p className="text-sm text-slate-600">
                    Can build: {system.beforeAvailable} → {system.afterAvailable} units
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-600">Reduction</p>
                  <p className="text-lg font-bold text-red-600">-{system.reduction}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onDownloadReport}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Download Report
        </button>
        <button
          onClick={onViewLogs}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
        >
          <BarChart3 className="h-4 w-4" />
          View Batch Logs
        </button>
        <button
          onClick={onNewImport}
          className="ml-auto rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700"
        >
          Import Another File
        </button>
      </div>
    </div>
  )
}
