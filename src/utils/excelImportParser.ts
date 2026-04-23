/**
 * Excel Import Module - Parsing and Validation Engine
 * Handles strict validation and data transformation
 */

import * as XLSX from 'xlsx'
import crypto from 'crypto'

// ============================================================
// CONSTANTS AND TYPES
// ============================================================

export const EXCEL_CONFIG = {
  SHEET_NAME: 'Stock_Import',
  EXPECTED_COLUMNS: [
    'Item Code',
    'Item Name',
    'System Code',
    'System Name',
    'Current Stock',
    'Issued Qty',
    'Closing Stock',
    'Unit Cost',
    'Total Value'
  ],
  EDITABLE_COLUMNS: ['Issued Qty', 'Closing Stock'],
  READONLY_COLUMNS: ['Item Name', 'System Name', 'Current Stock', 'Unit Cost', 'Total Value'],
  MANDATORY_COLUMNS: ['Item Code', 'System Code']
} as const

export type ValidationError = {
  rowNumber: number
  column: string
  message: string
  errorCode: string
  severity: 'error' | 'warning'
}

export type ImportRow = {
  itemCode: string
  itemName: string
  systemCode: string
  systemName: string
  currentStock: number
  issuedQty: number | null
  closingStock: number | null
  unitCost: number
  totalValue: number
  rowNumber: number
  errors: ValidationError[]
  warnings: ValidationError[]
}

export type ParsedExcelData = {
  rows: ImportRow[]
  fileHash: string
  totalRows: number
  validationSummary: {
    totalRows: number
    validRows: number
    errorRows: number
    warningRows: number
  }
}

// ============================================================
// FILE HASHING (Prevent duplicate uploads)
// ============================================================

export function generateFileHash(fileBuffer: Buffer): string {
  return crypto.createHash('sha256').update(fileBuffer).digest('hex')
}

// ============================================================
// EXCEL PARSING
// ============================================================

export async function parseExcelFile(
  file: Blob | Buffer
): Promise<{ data: ParsedExcelData | null; fileError: string | null }> {
  try {
    // Read workbook
    const arrayBuffer =
      file instanceof Blob
        ? await file.arrayBuffer()
        : file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)

    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    // Validate sheet exists
    if (!workbook.SheetNames.includes(EXCEL_CONFIG.SHEET_NAME)) {
      return {
        data: null,
        fileError: `Sheet "${EXCEL_CONFIG.SHEET_NAME}" not found. Available sheets: ${workbook.SheetNames.join(', ')}`
      }
    }

    const worksheet = workbook.Sheets[EXCEL_CONFIG.SHEET_NAME]
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

    // Validate headers
    if (rawData.length === 0) {
      return { data: null, fileError: 'Sheet is empty' }
    }

    const firstRow = rawData[0] as Record<string, unknown>
    const actualColumns = Object.keys(firstRow)
    const headerError = validateExcelHeaders(actualColumns)

    if (headerError) {
      return { data: null, fileError: headerError }
    }

    // Parse rows
    const parsedRows = rawData.map((row: any, index: number) =>
      parseRow(row, index + 2) // +2 because row 1 is header
    )

    // Calculate file hash
    const fileBuffer = file instanceof Blob ? Buffer.from(await file.arrayBuffer()) : file
    const fileHash = generateFileHash(fileBuffer)

    // Build response
    const validRows = parsedRows.filter((r: ImportRow) => r.errors.length === 0).length
    const errorRows = parsedRows.filter((r: ImportRow) => r.errors.length > 0).length
    const warningRows = parsedRows.filter((r: ImportRow) => r.warnings.length > 0 && r.errors.length === 0).length

    return {
      data: {
        rows: parsedRows,
        fileHash,
        totalRows: parsedRows.length,
        validationSummary: {
          totalRows: parsedRows.length,
          validRows,
          errorRows,
          warningRows
        }
      },
      fileError: null
    }
  } catch (error) {
    return {
      data: null,
      fileError: `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// ============================================================
// HEADER VALIDATION
// ============================================================

function validateExcelHeaders(actualColumns: string[]): string | null {
  // Check column count
  if (actualColumns.length !== EXCEL_CONFIG.EXPECTED_COLUMNS.length) {
    return `Expected ${EXCEL_CONFIG.EXPECTED_COLUMNS.length} columns, found ${actualColumns.length}`
  }

  // Check exact order
  for (let i = 0; i < EXCEL_CONFIG.EXPECTED_COLUMNS.length; i++) {
    if (actualColumns[i] !== EXCEL_CONFIG.EXPECTED_COLUMNS[i]) {
      return `Column ${i + 1}: expected "${EXCEL_CONFIG.EXPECTED_COLUMNS[i]}", found "${actualColumns[i]}"`
    }
  }

  return null
}

// ============================================================
// ROW PARSING & VALIDATION
// ============================================================

function parseRow(rawRow: any, rowNumber: number): ImportRow {
  const rawItemCode = rawRow['Item Code']
  const rawItemName = rawRow['Item Name']
  const rawSystemCode = rawRow['System Code']
  const rawCurrentStock = rawRow['Current Stock']
  const rawIssuedQty = rawRow['Issued Qty']
  const rawClosingStock = rawRow['Closing Stock']

  const row: ImportRow = {
    itemCode: String(rawItemCode || '').trim().toUpperCase(),
    itemName: String(rawItemName || '').trim(),
    systemCode: String(rawSystemCode || '').trim().toUpperCase(),
    systemName: String(rawRow['System Name'] || '').trim(),
    currentStock: parseNumeric(rawCurrentStock),
    issuedQty: parseNumericOrNull(rawIssuedQty),
    closingStock: parseNumericOrNull(rawClosingStock),
    unitCost: parseNumeric(rawRow['Unit Cost']),
    totalValue: parseNumeric(rawRow['Total Value']),
    rowNumber,
    errors: [],
    warnings: []
  }

  // Run validations
  validateMandatoryFields(row, rawRow)
  validateNumericFields(row, rawRow)
  validateBusinessLogic(row)
  calculateClosingStock(row)

  return row
}

function parseNumeric(value: any): number {
  if (value === '' || value === null || value === undefined) return 0
  const num = parseFloat(String(value).trim())
  return isNaN(num) ? 0 : num
}

function parseNumericOrNull(value: any): number | null {
  if (value === '' || value === null || value === undefined) return null
  const num = parseFloat(String(value).trim())
  return isNaN(num) ? null : num
}

function validateMandatoryFields(row: ImportRow, rawRow: any): void {
  if (!row.itemCode) {
    row.errors.push({
      rowNumber: row.rowNumber,
      column: 'Item Code',
      message: 'Item Code is mandatory',
      errorCode: 'MANDATORY_FIELD_MISSING',
      severity: 'error'
    })
  }

  if (!row.itemName) {
    row.errors.push({
      rowNumber: row.rowNumber,
      column: 'Item Name',
      message: 'Item Name is mandatory',
      errorCode: 'MANDATORY_FIELD_MISSING',
      severity: 'error'
    })
  }

  if (!row.systemCode) {
    row.errors.push({
      rowNumber: row.rowNumber,
      column: 'System Code',
      message: 'System Code is mandatory',
      errorCode: 'MANDATORY_FIELD_MISSING',
      severity: 'error'
    })
  }

  const hasCurrentStock = !(rawRow['Current Stock'] === '' || rawRow['Current Stock'] === null || rawRow['Current Stock'] === undefined)
  if (!hasCurrentStock) {
    row.errors.push({
      rowNumber: row.rowNumber,
      column: 'Current Stock',
      message: 'Current Stock is mandatory',
      errorCode: 'MANDATORY_FIELD_MISSING',
      severity: 'error'
    })
  }

  const hasIssuedQty = !(rawRow['Issued Qty'] === '' || rawRow['Issued Qty'] === null || rawRow['Issued Qty'] === undefined)
  const hasClosingStock = !(rawRow['Closing Stock'] === '' || rawRow['Closing Stock'] === null || rawRow['Closing Stock'] === undefined)

  if (!hasIssuedQty && !hasClosingStock) {
    row.errors.push({
      rowNumber: row.rowNumber,
      column: 'Issued Qty / Closing Stock',
      message: 'Either Issued Qty or Closing Stock must be provided',
      errorCode: 'MANDATORY_FIELD_MISSING',
      severity: 'error'
    })
  }
}

function validateNumericFields(row: ImportRow, rawRow: any): void {
  const isInvalidNumber = (value: any): boolean => {
    if (value === '' || value === null || value === undefined) return false
    const num = parseFloat(String(value).trim())
    return Number.isNaN(num)
  }

  if (isInvalidNumber(rawRow['Current Stock'])) {
    row.errors.push({
      rowNumber: row.rowNumber,
      column: 'Current Stock',
      message: 'Current Stock must be numeric',
      errorCode: 'INVALID_NUMERIC',
      severity: 'error'
    })
  }

  if (isInvalidNumber(rawRow['Issued Qty'])) {
    row.errors.push({
      rowNumber: row.rowNumber,
      column: 'Issued Qty',
      message: 'Issued Qty must be numeric',
      errorCode: 'INVALID_NUMERIC',
      severity: 'error'
    })
  }

  if (isInvalidNumber(rawRow['Closing Stock'])) {
    row.errors.push({
      rowNumber: row.rowNumber,
      column: 'Closing Stock',
      message: 'Closing Stock must be numeric',
      errorCode: 'INVALID_NUMERIC',
      severity: 'error'
    })
  }

  // Issued Qty validation
  if (row.issuedQty !== null && row.issuedQty < 0) {
    row.errors.push({
      rowNumber: row.rowNumber,
      column: 'Issued Qty',
      message: 'Issued Qty cannot be negative',
      errorCode: 'INVALID_NUMERIC',
      severity: 'error'
    })
  }

  // Closing Stock validation
  if (row.closingStock !== null && row.closingStock < 0) {
    row.errors.push({
      rowNumber: row.rowNumber,
      column: 'Closing Stock',
      message: 'Closing Stock cannot be negative',
      errorCode: 'INVALID_NUMERIC',
      severity: 'error'
    })
  }

  // Current Stock validation
  if (row.currentStock < 0) {
    row.errors.push({
      rowNumber: row.rowNumber,
      column: 'Current Stock',
      message: 'Current Stock cannot be negative',
      errorCode: 'INVALID_NUMERIC',
      severity: 'error'
    })
  }
}

function validateBusinessLogic(row: ImportRow): void {
  // Check if both Issued Qty and Closing Stock are provided
  if (row.issuedQty !== null && row.closingStock !== null) {
    const calculatedClosing = row.currentStock - row.issuedQty
    if (Math.abs(calculatedClosing - row.closingStock) > 0.01) {
      row.errors.push({
        rowNumber: row.rowNumber,
        column: 'Closing Stock',
        message: `Closing Stock (${row.closingStock}) does not match Current Stock (${row.currentStock}) - Issued Qty (${row.issuedQty})`,
        errorCode: 'CLOSING_STOCK_MISMATCH',
        severity: 'error'
      })
    }
  }

  // Check if Closing Stock exceeds Current Stock
  if (row.closingStock !== null && row.closingStock > row.currentStock) {
    row.errors.push({
      rowNumber: row.rowNumber,
      column: 'Closing Stock',
      message: 'Closing Stock cannot exceed Current Stock',
      errorCode: 'CLOSING_EXCEEDS_CURRENT',
      severity: 'error'
    })
  }

  // Check if Issued Qty exceeds Current Stock
  if (row.issuedQty !== null && row.issuedQty > row.currentStock) {
    row.errors.push({
      rowNumber: row.rowNumber,
      column: 'Issued Qty',
      message: 'Issued Qty cannot exceed Current Stock',
      errorCode: 'ISSUED_EXCEEDS_CURRENT',
      severity: 'error'
    })
  }
}

function calculateClosingStock(row: ImportRow): void {
  // If only Issued Qty is provided, calculate Closing Stock
  if (row.issuedQty !== null && row.closingStock === null) {
    row.closingStock = row.currentStock - row.issuedQty
  }

  // If only Closing Stock is provided, calculate Issued Qty
  if (row.closingStock !== null && row.issuedQty === null) {
    row.issuedQty = row.currentStock - row.closingStock
  }

  // If neither provided, set to zero movement
  if (row.issuedQty === null && row.closingStock === null) {
    row.issuedQty = null
    row.closingStock = null
  }
}

// ============================================================
// DATABASE VALIDATION (Run after parsing)
// ============================================================

export type DatabaseValidationContext = {
  itemCodeMap: Map<string, { id: string; name: string; currentStock: number }>
  systemCodeMap: Map<string, { id: string; name: string }>
}

export async function validateAgainstDatabase(
  rows: ImportRow[],
  context: DatabaseValidationContext
): Promise<ImportRow[]> {
  return rows.map((row) => {
    // Validate Item Code exists
    const item = context.itemCodeMap.get(row.itemCode)
    if (!item) {
      row.warnings.push({
        rowNumber: row.rowNumber,
        column: 'Item Code',
        message: `Item Code "${row.itemCode}" not found in inventory. This row will be treated as NEW item.`,
        errorCode: 'NEW_ITEM_DETECTED',
        severity: 'warning'
      })
    } else {
      row.itemName = item.name
    }

    // Validate System Code exists
    const system = context.systemCodeMap.get(row.systemCode)
    if (!system) {
      row.errors.push({
        rowNumber: row.rowNumber,
        column: 'System Code',
        message: `System Code "${row.systemCode}" not found`,
        errorCode: 'SYSTEM_CODE_NOT_FOUND',
        severity: 'error'
      })
    } else {
      row.systemName = system.name
    }

    // Compare imported Current Stock with DB stock
    if (item && Math.abs(row.currentStock - item.currentStock) > 0.01) {
      row.warnings.push({
        rowNumber: row.rowNumber,
        column: 'Current Stock',
        message: `Current Stock in file (${row.currentStock}) differs from system (${item.currentStock})`,
        errorCode: 'CURRENT_STOCK_MISMATCH',
        severity: 'warning'
      })
    }

    return row
  })
}
