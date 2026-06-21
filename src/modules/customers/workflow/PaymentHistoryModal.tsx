"use client"

import { useState } from "react"
import { X, Download, FileText, Image as ImageIcon } from "lucide-react"
import { downloadDocument } from "@/services/documentService"
import type { PaymentRow } from "@/services/paymentService"

type PaymentHistoryModalProps = {
  open: boolean
  payments: PaymentRow[]
  onClose: () => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
}

function isImageUrl(url: string | null) {
  if (!url) return false
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(url)
}

function ProofViewer({ proofUrl }: { proofUrl: string | null }) {
  const [downloading, setDownloading] = useState(false)

  if (!proofUrl) return <span className="text-[12px] text-slate-400">—</span>

  const isImage = isImageUrl(proofUrl)
  const fileName = proofUrl.split("/").pop() ?? "proof"

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const { data } = await downloadDocument(proofUrl)
      if (!data) return
      const url = URL.createObjectURL(data)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isImage ? (
        <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
      ) : (
        <FileText className="h-3.5 w-3.5 text-slate-500" />
      )}
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="text-[12px] font-medium text-blue-600 hover:underline"
      >
        {downloading ? "Downloading..." : fileName}
      </button>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="p-1 rounded hover:bg-slate-100"
        aria-label="Download proof"
      >
        <Download className="h-3 w-3 text-slate-500" />
      </button>
    </div>
  )
}

export default function PaymentHistoryModal({
  open,
  payments,
  onClose
}: PaymentHistoryModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex w-full max-w-[680px] max-h-[85vh] flex-col rounded-2xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-[16px] font-semibold text-slate-900">
              Payment History
            </h3>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {payments.length} {payments.length === 1 ? "payment" : "payments"} recorded
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {payments.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No payments have been recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-semibold text-slate-900">
                          {formatCurrency(payment.amount)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {payment.payment_method}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-slate-500">
                        {formatDate(payment.payment_date)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-[12px] sm:grid-cols-2">
                    {payment.notes ? (
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-slate-500">Notes: </span>
                        <span className="text-slate-700">{payment.notes}</span>
                      </div>
                    ) : null}
                  </div>

                  {payment.proof_url ? (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <ProofViewer proofUrl={payment.proof_url} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
