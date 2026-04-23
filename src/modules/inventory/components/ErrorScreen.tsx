'use client'

import React from 'react'
import { AlertCircle, ChevronDown, X } from 'lucide-react'

interface ValidationError {
  rowNumber: number
  field: string
  code: string
  message: string
  severity: 'error' | 'warning'
  value?: any
  details?: Record<string, any>
}

interface Duplicate {
  itemCode: string
  systemCode: string
  rows: number[]
}

interface ErrorScreenProps {
  title: string
  message: string
  errors?: ValidationError[]
  warnings?: ValidationError[]
  duplicates?: Duplicate[]
  summary?: {
    totalErrors: number
    totalWarnings: number
    totalDuplicates: number
    blockingErrors: boolean
  }
  canContinue?: boolean
  onRetry?: () => void
  onEdit?: () => void
  onContinue?: () => void
}

export default function ErrorScreen({
  title,
  message,
  errors = [],
  warnings = [],
  duplicates = [],
  summary,
  canContinue = false,
  onRetry,
  onEdit,
  onContinue
}: ErrorScreenProps) {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    errors: true,
    warnings: false,
    duplicates: false
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="space-y-6 p-6">
      {/* ERROR CARD */}
      <div className="rounded-lg border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-8">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-red-900">{title}</h1>
            <p className="mt-1 text-red-700">{message}</p>
            {summary && (
              <div className="mt-3 flex gap-4 text-sm">
                {summary.totalErrors > 0 && (
                  <span className="text-red-600">
                    <strong>{summary.totalErrors}</strong> error{summary.totalErrors !== 1 ? 's' : ''}
                  </span>
                )}
                {summary.totalWarnings > 0 && (
                  <span className="text-yellow-600">
                    <strong>{summary.totalWarnings}</strong> warning{summary.totalWarnings !== 1 ? 's' : ''}
                  </span>
                )}
                {summary.totalDuplicates > 0 && (
                  <span className="text-orange-600">
                    <strong>{summary.totalDuplicates}</strong> duplicate{summary.totalDuplicates !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ERRORS SECTION */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-white">
          <button
            onClick={() => toggleSection('errors')}
            className="flex w-full items-center justify-between border-b border-red-200 px-6 py-4 hover:bg-red-50"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="font-semibold text-red-900">
                Validation Errors ({errors.length})
              </span>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-red-600 transition-transform ${
                expandedSections.errors ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSections.errors && (
            <div className="space-y-3 px-6 py-4">
              {errors.map((error, idx) => (
                <div key={idx} className="rounded-lg border border-red-100 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-red-900">
                        Row {error.rowNumber} • {error.field}
                      </p>
                      <p className="mt-1 text-sm text-red-700">{error.message}</p>
                      {error.value !== undefined && (
                        <p className="mt-1 text-xs font-mono text-red-600">
                          Value: {typeof error.value === 'object' ? JSON.stringify(error.value) : error.value}
                        </p>
                      )}
                      {error.details && Object.keys(error.details).length > 0 && (
                        <div className="mt-2 text-xs text-red-600">
                          {Object.entries(error.details).map(([key, value]) => (
                            <p key={key}>
                              <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : value}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="rounded bg-red-200 px-2 py-1 text-xs font-mono font-semibold text-red-900">
                      {error.code}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WARNINGS SECTION */}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-white">
          <button
            onClick={() => toggleSection('warnings')}
            className="flex w-full items-center justify-between border-b border-yellow-200 px-6 py-4 hover:bg-yellow-50"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="font-semibold text-yellow-900">
                Warnings ({warnings.length})
              </span>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-yellow-600 transition-transform ${
                expandedSections.warnings ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSections.warnings && (
            <div className="space-y-3 px-6 py-4">
              {warnings.map((warning, idx) => (
                <div key={idx} className="rounded-lg border border-yellow-100 bg-yellow-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-yellow-900">
                        Row {warning.rowNumber} • {warning.field}
                      </p>
                      <p className="mt-1 text-sm text-yellow-700">{warning.message}</p>
                      {warning.details && Object.keys(warning.details).length > 0 && (
                        <div className="mt-2 text-xs text-yellow-600">
                          {Object.entries(warning.details).map(([key, value]) => (
                            <p key={key}>
                              <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : value}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="rounded bg-yellow-200 px-2 py-1 text-xs font-mono font-semibold text-yellow-900">
                      {warning.code}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DUPLICATES SECTION */}
      {duplicates.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-white">
          <button
            onClick={() => toggleSection('duplicates')}
            className="flex w-full items-center justify-between border-b border-orange-200 px-6 py-4 hover:bg-orange-50"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <span className="font-semibold text-orange-900">
                Duplicate Entries ({duplicates.length})
              </span>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-orange-600 transition-transform ${
                expandedSections.duplicates ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSections.duplicates && (
            <div className="space-y-3 px-6 py-4">
              {duplicates.map((dup, idx) => (
                <div key={idx} className="rounded-lg border border-orange-100 bg-orange-50 p-4">
                  <p className="font-semibold text-orange-900">
                    {dup.itemCode} + {dup.systemCode}
                  </p>
                  <p className="mt-1 text-sm text-orange-700">
                    Found in rows: {dup.rows.join(', ')}
                  </p>
                  <p className="mt-1 text-xs text-orange-600">
                    Remove duplicates and keep only one entry per item-system combination
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="flex flex-wrap gap-3">
        {onEdit && (
          <button
            onClick={onEdit}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Edit Data
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Upload Different File
          </button>
        )}
        {onContinue && canContinue && (
          <button
            onClick={onContinue}
            className="ml-auto rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Continue with Warnings
          </button>
        )}
        {!canContinue && onRetry && (
          <button
            onClick={onRetry}
            className="ml-auto rounded-lg bg-red-600 px-6 py-2 text-white hover:bg-red-700"
          >
            Fix and Retry
          </button>
        )}
      </div>
    </div>
  )
}
