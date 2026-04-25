'use client'

import React, { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, TrendingDown } from 'lucide-react'
import { calculateSystemAvailability } from '@/utils/systemAvailabilityCalculator'

type SystemAvailability = {
  systemId: string
  systemName: string
  canBuild: number
  status: 'available' | 'limited' | 'unavailable'
  components: any[]
  missingComponents: any[]
}

type LowStockAlert = {
  spareName: string
  currentStock: number
  minStock: number
  stockLevel: 'low' | 'critical'
}

type ShortageItem = {
  spareName: string
  requiredQty: number
  availableQty: number
  shortageQty: number
}

export default function SystemAvailabilityDashboard() {
  const [systems, setSystems] = useState<SystemAvailability[]>([])
  const [lowStocks, setLowStocks] = useState<LowStockAlert[]>([])
  const [shortages, setShortages] = useState<ShortageItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAvailability()
  }, [])

  const loadAvailability = async () => {
    setLoading(true)
    try {
      // This would need to be called from an API endpoint in production
      // const result = await calculateSystemAvailability(organizationId)
      // For now, showing component structure
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'limited':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'unavailable':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-50 border-green-200'
      case 'limited':
        return 'bg-yellow-50 border-yellow-200'
      case 'unavailable':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-slate-50'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Available</span>
      case 'limited':
        return <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">Limited</span>
      case 'unavailable':
        return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Not Available</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">System Availability</h1>
        <p className="text-slate-600">Real-time view of how many systems can be built with current inventory</p>
      </div>

      {/* SYSTEM AVAILABILITY TABLE */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Systems</h2>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {systems.map((system) => (
            <div
              key={system.systemId}
              className={`rounded-lg border p-4 ${getStatusColor(system.status)}`}
            >
              <div className="space-y-3">
                {/* System Name */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{system.systemName}</h3>
                    <p className="text-xs text-slate-500">{system.components.length} components</p>
                  </div>
                  {getStatusIcon(system.status)}
                </div>

                {/* Can Build Count */}
                <div className="mt-4 space-y-1">
                  <p className="text-xs font-medium text-slate-600">Can Build</p>
                  <p className="text-3xl font-bold text-slate-900">{system.canBuild}</p>
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-between pt-2">
                  {getStatusBadge(system.status)}
                </div>

                {/* Missing Components (if any) */}
                {system.missingComponents.length > 0 && (
                  <div className="space-y-2 border-t border-current border-opacity-10 pt-3">
                    <p className="text-xs font-semibold text-slate-700">Missing:</p>
                    {system.missingComponents.slice(0, 2).map((comp, idx) => (
                      <div key={idx} className="text-xs text-slate-600">
                        <span className="font-medium">{comp.spareName}:</span> {comp.shortageQty} units needed
                      </div>
                    ))}
                    {system.missingComponents.length > 2 && (
                      <p className="text-xs italic text-slate-500">
                        +{system.missingComponents.length - 2} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {systems.length === 0 && !loading && (
          <div className="card border-dashed p-12 text-center">
            <p className="text-slate-500">No systems found. Create systems first.</p>
          </div>
        )}
      </div>

      {/* LOW STOCK ALERTS */}
      {lowStocks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Low Stock Alerts</h2>
          
          <div className="space-y-2">
            {lowStocks.map((alert, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  alert.stockLevel === 'critical'
                    ? 'border-red-200 bg-red-50'
                    : 'border-yellow-200 bg-yellow-50'
                }`}
              >
                <AlertCircle
                  className={`h-5 w-5 ${
                    alert.stockLevel === 'critical' ? 'text-red-600' : 'text-yellow-600'
                  }`}
                />
                
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{alert.spareName}</p>
                  <p className="text-sm text-slate-600">
                    {alert.stockLevel === 'critical'
                      ? 'Out of stock!'
                      : `${alert.currentStock} / ${alert.minStock} min`}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{alert.currentStock}</p>
                  <p className="text-xs text-slate-500">in stock</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SHORTAGE SUMMARY */}
      {shortages.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Shortages by Item</h2>
          
          <div className="table-shell overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Item</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Required</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Available</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Shortage</th>
                </tr>
              </thead>
              <tbody>
                {shortages.map((shortage, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">{shortage.spareName}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{shortage.requiredQty}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{shortage.availableQty}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="rounded-lg bg-red-100 px-2 py-1 text-sm font-semibold text-red-700">
                        {shortage.shortageQty}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {systems.length === 0 && shortages.length === 0 && !loading && (
        <div className="card border-green-200 bg-green-50 p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
          <h3 className="mt-2 text-lg font-semibold text-green-900">All Systems Available</h3>
          <p className="mt-1 text-green-700">No shortages detected. You can build all configured systems.</p>
        </div>
      )}
    </div>
  )
}
