type PaymentSummaryCardsProps = {
  projectValue: number
  paidAmount: number
  remainingAmount: number
  compact?: boolean
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value)
}

export default function PaymentSummaryCards({
  projectValue,
  paidAmount,
  remainingAmount,
  compact = false,
}: PaymentSummaryCardsProps) {
  return (
    <div className={`payment-summary-grid ${compact ? "payment-summary-grid-compact" : ""}`}>
      <div className="payment-summary-card">
        <p className="payment-summary-label">Project Value</p>
        <p className="payment-summary-value">{formatCurrency(projectValue)}</p>
      </div>
      <div className="payment-summary-card">
        <p className="payment-summary-label">Paid Amount</p>
        <p className="payment-summary-value">{formatCurrency(paidAmount)}</p>
      </div>
      <div className="payment-summary-card">
        <p className="payment-summary-label">Remaining</p>
        <p className={`payment-summary-value ${remainingAmount > 0 ? "payment-summary-value-warning" : ""}`}>
          {formatCurrency(remainingAmount)}
        </p>
      </div>
    </div>
  )
}
