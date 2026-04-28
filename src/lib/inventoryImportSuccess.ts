export type InventoryImportSuccessPayload = {
  updatedRows: number
  newRows: number
  errorRows: number
  spareCodes: string[]
  timestamp: number
}

const INVENTORY_IMPORT_SUCCESS_KEY = 'solarflow.inventory.import.success'

export function persistInventoryImportSuccess(
  payload: Omit<InventoryImportSuccessPayload, 'timestamp'>
) {
  if (typeof window === 'undefined') return

  const spareCodes = [...new Set(payload.spareCodes.map((value) => String(value || '').trim()).filter(Boolean))]

  window.sessionStorage.setItem(
    INVENTORY_IMPORT_SUCCESS_KEY,
    JSON.stringify({
      ...payload,
      spareCodes,
      timestamp: Date.now()
    } satisfies InventoryImportSuccessPayload)
  )
}

export function consumeInventoryImportSuccess(maxAgeMs = 60_000): InventoryImportSuccessPayload | null {
  if (typeof window === 'undefined') return null

  const raw = window.sessionStorage.getItem(INVENTORY_IMPORT_SUCCESS_KEY)
  if (!raw) return null

  window.sessionStorage.removeItem(INVENTORY_IMPORT_SUCCESS_KEY)

  try {
    const payload = JSON.parse(raw) as InventoryImportSuccessPayload
    if (!payload || typeof payload.timestamp !== 'number') return null
    if (Date.now() - payload.timestamp > maxAgeMs) return null
    return payload
  } catch {
    return null
  }
}