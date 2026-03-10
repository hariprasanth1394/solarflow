"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCustomerById } from '../../services/customerService'
import { formatDateTimeUTC } from '../../utils/dateFormat'

const stages = ['Created', 'Submitted', 'Approved', 'Installed', 'Closed']

function stageProgress(status) {
  const normalized = (status || '').toLowerCase()

  if (normalized.includes('closed')) return 100
  if (normalized.includes('installed')) return 80
  if (normalized.includes('approved')) return 60
  if (normalized.includes('submitted')) return 40
  return 20
}

export default function CustomerDetailPage({ customerId }) {
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      const { data, error } = await getCustomerById(customerId)

      if (error) {
        setMessage(error.message)
      } else if (!data) {
        setMessage('Customer not found')
      } else {
        setCustomer(data)
        setMessage('')
      }

      setLoading(false)
    }, 0)

    return () => clearTimeout(timer)
  }, [customerId])

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Customer Details</h2>
            <p className="mt-1 text-sm text-gray-600">View and manage customer profile and workflow progress.</p>
          </div>
          <Link href="/customers" className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
            Back to Customers
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-gray-500">Loading customer details...</p>
        ) : message ? (
          <p className="text-sm text-gray-600">{message}</p>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{customer.name}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {customer.phone || '-'} · {customer.email || '-'} · {customer.company || 'No Company'}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex justify-between text-xs text-gray-600 sm:text-sm">
                {stages.map((stage) => (
                  <span key={stage}>{stage}</span>
                ))}
              </div>
              <div className="mt-3 h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-violet-600 transition-all"
                  style={{ width: `${stageProgress(customer.status)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Current Status</p>
                <p className="mt-2 text-sm font-semibold text-gray-800">{customer.status || 'Created'}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Created At</p>
                <p className="mt-2 text-sm font-semibold text-gray-800">{formatDateTimeUTC(customer.created_at)}</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
