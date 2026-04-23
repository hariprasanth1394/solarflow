'use client'

import React from 'react'
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ChevronDown
} from 'lucide-react'

interface BomItem {
  spareName: string
  required: number
  available: number
  shortage: number
}

interface SystemAvailability {
  systemId: string
  systemName: string
  canBuild: number
  status: 'available' | 'limited' | 'unavailable'
  shortageDetected: boolean
  missingComponents?: BomItem[]
}

interface SystemAvailabilityDisplayProps {
  systemsAvailability: SystemAvailability[]
  title?: string
  onSystemClick?: (systemId: string) => void
}

export default function SystemAvailabilityDisplay({
  systemsAvailability,
  title = 'System Availability',
  onSystemClick
}: SystemAvailabilityDisplayProps) {
  const [expandedSystem, setExpandedSystem] = React.useState<string | null>(null)

  const availableSystems = systemsAvailability.filter((s) => s.status === 'available')
  const limitedSystems = systemsAvailability.filter((s) => s.status === 'limited')
  const unavailableSystems = systemsAvailability.filter((s) => s.status === 'unavailable')

  const getStatusColor = (status: 'available' | 'limited' | 'unavailable') => {
    switch (status) {
      case 'available':
        return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', icon: 'text-green-600' }
      case 'limited':
        return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', icon: 'text-yellow-600' }
      case 'unavailable':
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', icon: 'text-red-600' }
    }
  }

  const SystemCard = ({ system }: { system: SystemAvailability }) => {
    const colors = getStatusColor(system.status)
    const isExpanded = expandedSystem === system.systemId

    return (
      <div key={system.systemId} className={`rounded-lg border ${colors.border} ${colors.bg}`}>
        <button
          onClick={() => {
            setExpandedSystem(isExpanded ? null : system.systemId)
            onSystemClick?.(system.systemId)
          }}
          className={`w-full px-6 py-4 text-left ${isExpanded ? `border-b ${colors.border}` : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {system.status === 'available' && <CheckCircle className={`h-5 w-5 ${colors.icon}`} />}
              {system.status === 'limited' && <AlertTriangle className={`h-5 w-5 ${colors.icon}`} />}
              {system.status === 'unavailable' && <AlertCircle className={`h-5 w-5 ${colors.icon}`} />}
              <div>
                <p className={`font-semibold ${colors.text}`}>{system.systemName}</p>
                <p className="text-xs text-slate-600">{system.systemId}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className={`text-2xl font-bold ${colors.text}`}>{system.canBuild}</p>
                <p className="text-xs text-slate-600">can build</p>
              </div>
              {system.missingComponents && system.missingComponents.length > 0 && (
                <ChevronDown
                  className={`h-5 w-5 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              )}
            </div>
          </div>
        </button>

        {/* SHORTAGE DETAILS */}
        {isExpanded && system.missingComponents && system.missingComponents.length > 0 && (
          <div className="space-y-2 px-6 py-4">
            <p className="text-sm font-semibold text-slate-700">Missing Components:</p>
            {system.missingComponents.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between rounded bg-white/50 px-3 py-2 text-sm">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{item.spareName}</p>
                  <p className="text-xs text-slate-600">
                    Need {item.required} | Have {item.available}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-semibold text-red-600">
                    -{item.shortage}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">
          Showing availability based on current stock and BOM requirements
        </p>
      </div>

      {/* AVAILABLE SYSTEMS */}
      {availableSystems.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Available ({availableSystems.length})
          </h3>
          <div className="space-y-2">
            {availableSystems.map((system) => (
              <SystemCard key={system.systemId} system={system} />
            ))}
          </div>
        </div>
      )}

      {/* LIMITED SYSTEMS */}
      {limitedSystems.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Limited Stock ({limitedSystems.length})
          </h3>
          <div className="space-y-2">
            {limitedSystems.map((system) => (
              <SystemCard key={system.systemId} system={system} />
            ))}
          </div>
        </div>
      )}

      {/* UNAVAILABLE SYSTEMS */}
      {unavailableSystems.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Not Available ({unavailableSystems.length})
          </h3>
          <div className="space-y-2">
            {unavailableSystems.map((system) => (
              <SystemCard key={system.systemId} system={system} />
            ))}
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {systemsAvailability.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-slate-600">No systems available</p>
        </div>
      )}

      {/* SUMMARY STATS */}
      {systemsAvailability.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-xs font-medium text-slate-600">Available for Production</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{availableSystems.length}</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-3">
              <p className="text-xs font-medium text-slate-600">Limited Stock</p>
              <p className="mt-1 text-2xl font-bold text-yellow-600">{limitedSystems.length}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xs font-medium text-slate-600">Out of Stock</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{unavailableSystems.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
