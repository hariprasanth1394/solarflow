export function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

export function makeInventoryMatchKey(itemCode: unknown, systemName: unknown): string {
  return `${normalize(itemCode)}::${normalize(systemName)}`
}

export function makeSpareCodeKey(spareCode: unknown): string {
  return normalize(spareCode)
}
