"use client"

import { useState } from "react"
import { CircleCheck, Download, Eye, FileText, Image as ImageIcon } from "lucide-react"
import Modal from "@/components/ui/Modal"
import { downloadDocument } from "@/services/documentService"
import type { PaymentRow } from "@/services/paymentService"
import { parsePaymentCollectedBy, parsePaymentReference } from "./paymentHelpers"

type PaymentHistoryModalProps = {
  open: boolean
  payments: PaymentRow[]
  onClose: () => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function isImageUrl(url: string | null) {
  if (!url) return false
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(url)
}

function ProofActions({ proofUrl }: { proofUrl: string | null }) {
  const [loading, setLoading] = useState(false)

  if (!proofUrl) return <span className="text-[12px] text-[var(--sf-muted-text)]">No proof attached</span>

  const fileName = proofUrl.split("/").pop() ?? "proof"
  const isImage = isImageUrl(proofUrl)

  const handleOpen = async () => {
    setLoading(true)
    try {
      const { data } = await downloadDocument(proofUrl)
      if (!data) return
      const url = URL.createObjectURL(data)
      window.open(url, "_blank", "noopener,noreferrer")
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    setLoading(true)
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
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isImage ? <ImageIcon className="h-3.5 w-3.5 text-[var(--sf-primary-start)]" /> : <FileText className="h-3.5 w-3.5 text-[var(--sf-muted-text)]" />}
      <span className="truncate text-[12px] text-[var(--sf-text)]">{fileName}</span>
      <button type="button" onClick={handleOpen} disabled={loading} className="btn btn-secondary btn-compact h-8 px-2 text-[11px]">
        <Eye className="h-3 w-3" />
        Preview
      </button>
      <button type="button" onClick={handleDownload} disabled={loading} className="btn btn-secondary btn-compact h-8 px-2 text-[11px]">
        <Download className="h-3 w-3" />
        Download
      </button>
    </div>
  )
}

export default function PaymentHistoryModal({ open, payments, onClose }: PaymentHistoryModalProps) {
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  )

  return (
    <Modal
      open={open}
      title="Payment History"
      subtitle={`${payments.length} ${payments.length === 1 ? "payment" : "payments"} recorded`}
      showCloseButton
      panelClassName="sf-modal-panel-wide"
      mobileFullscreen
      onClose={onClose}
      bodyClassName="p-0"
    >
      {sortedPayments.length === 0 ? (
        <div className="sf-payment-history-empty">No payments have been recorded yet.</div>
      ) : (
        <div className="payment-history-timeline sf-payment-history-scroll sf-scroll-area px-6 py-4">
          {sortedPayments.map((payment) => {
            const reference = parsePaymentReference(payment.notes)
            const collectedBy = parsePaymentCollectedBy(payment.notes)
            const noteText = payment.notes
              ?.split("\n")
              .filter((line) => !line.startsWith("Reference:") && !line.startsWith("Collected By:"))
              .join("\n")
              .trim()

            return (
              <div key={payment.id} className="payment-history-item">
                <div className="payment-history-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold text-[var(--sf-text)]">{formatCurrency(payment.amount)}</p>
                      <p className="mt-1 text-[12px] text-[var(--sf-muted-text)]">{formatDate(payment.payment_date)}</p>
                    </div>
                    <span className="workflow-badge-pending inline-flex items-center rounded-[6px] px-2 py-0.5 text-[10px] font-medium">
                      {payment.payment_method}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-[12px] sm:grid-cols-2">
                    {reference ? (
                      <div>
                        <span className="font-semibold text-[var(--sf-muted-text)]">Reference: </span>
                        <span className="text-[var(--sf-text)]">{reference}</span>
                      </div>
                    ) : null}
                    {collectedBy ? (
                      <div>
                        <span className="font-semibold text-[var(--sf-muted-text)]">Collected By: </span>
                        <span className="text-[var(--sf-text)]">{collectedBy}</span>
                      </div>
                    ) : null}
                    {noteText ? (
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-[var(--sf-muted-text)]">Notes: </span>
                        <span className="text-[var(--sf-text)]">{noteText}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 border-t border-[var(--sf-card-border)] pt-3">
                    <ProofActions proofUrl={payment.proof_url} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
