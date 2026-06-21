export function parseAmountFromNotes(notes: string | null | undefined, key: string) {
  const matches = Array.from((notes ?? "").matchAll(new RegExp(`${key}:\\s*([0-9]+(?:\\.[0-9]+)?)`, "gi")))
  if (!matches.length) return 0
  const last = matches[matches.length - 1]?.[1]
  return last ? Number(last) : 0
}

export function parseDiscountFromNotes(notes: string | null | undefined) {
  const discount = parseAmountFromNotes(notes, "Discount Amount")
  const reasonMatches = Array.from((notes ?? "").matchAll(/Discount Reason:\s*([^\n]+)/gi))
  const reason = reasonMatches[reasonMatches.length - 1]?.[1]?.trim() ?? ""
  const contractValue = parseAmountFromNotes(notes, "Contract Value")
  return { discount, reason, contractValue }
}

export function computeFinalBillable(contractValue: number, discount: number) {
  return Math.max(contractValue - Math.max(discount, 0), 0)
}

export function isInstallationCompleteStatus(status: string | null | undefined) {
  const normalized = (status ?? "").toLowerCase()
  return normalized.includes("completed_payment_pending") || normalized.includes("completed")
}

export function buildPaymentRecordNotes(
  notes: string | null | undefined,
  reference?: string,
  collectedBy?: string
) {
  const parts = [notes?.trim(), reference?.trim() ? `Reference: ${reference.trim()}` : "", collectedBy?.trim() ? `Collected By: ${collectedBy.trim()}` : ""]
    .filter(Boolean)
  return parts.length ? parts.join("\n") : null
}

export function parsePaymentReference(notes: string | null | undefined) {
  const matches = Array.from((notes ?? "").matchAll(/Reference:\s*([^\n]+)/gi))
  return matches[matches.length - 1]?.[1]?.trim() ?? null
}

export function parsePaymentCollectedBy(notes: string | null | undefined) {
  const matches = Array.from((notes ?? "").matchAll(/Collected By:\s*([^\n]+)/gi))
  return matches[matches.length - 1]?.[1]?.trim() ?? null
}
