/**
 * Enhanced Validation Engine for Excel Import
 * Strict validation with comprehensive error classification and reporting
 */

import { supabase } from '../lib/supabaseClient'

// ============================================================
// VALIDATION CONSTANTS
// ============================================================

export const EXCEL_STRUCTURE = {
  SHEET_NAME: 'Stock_Import',
  COLUMNS: ['Item Code', 'Item Name', 'System Code', 'System Name', 'Current Stock', 'Issued Qty', 'Closing Stock', 'Unit Cost'] as const,
  REQUIRED_COLUMNS: ['Item Code', 'System Code'],
  EDITABLE_COLUMNS: ['Issued Qty', 'Closing Stock'],
  READONLY_COLUMNS: ['Item Name', 'System Name', 'Current Stock', 'Unit Cost'],
} as const

export type ValidationSeverity = 'error' | 'warning'

export type ValidationMessage = {
  code: string
  message: string
  severity: ValidationSeverity
  field?: string
  value?: any
  details?: Record<string, any>
}

export type RowValidationResult = {
  rowNumber: number
  isValid: boolean
  errors: ValidationMessage[]
  warnings: ValidationMessage[]
  data?: {
    itemCode: string
    itemName: string
    systemCode: string
    systemName: string
    currentStock: number
    currentStockDb: number | null
    issuedQty: number | null
    closingStock: number | null
    unitCost: number
    stockMismatch: boolean
    mismatchAmount: number | null
  }
}

export type ValidationReport = {
  fileValidation: {
    isValid: boolean
    errors: ValidationMessage[]
  }
  headerValidation: {
    isValid: boolean
    errors: ValidationMessage[]
  }
  rowValidations: RowValidationResult[]
  duplicateRows: Array<{
    itemCode: string
    systemCode: string
    rows: number[]
  }>
  summary: {
    totalRows: number
    validRows: number
    errorRows: number
    warningRows: number
    duplicateRows: number
  }
}

// ============================================================
// VALIDATION CODES & MESSAGES
// ============================================================

export const VALIDATION_CODES = {
  // File-level errors
  FILE_INVALID_TYPE: {
    code: 'FILE_INVALID_TYPE',
    message: 'Only .xlsx files are supported',
    severity: 'error' as const
  },
  FILE_EMPTY: {
    code: 'FILE_EMPTY',
    message: 'File is empty or cannot be read',
    severity: 'error' as const
  },
  FILE_CORRUPTED: {
    code: 'FILE_CORRUPTED',
    message: 'File appears to be corrupted',
    severity: 'error' as const
  },

  // Sheet-level errors
  SHEET_NOT_FOUND: {
    code: 'SHEET_NOT_FOUND',
    message: `Sheet "${EXCEL_STRUCTURE.SHEET_NAME}" not found`,
    severity: 'error' as const
  },
  SHEET_EMPTY: {
    code: 'SHEET_EMPTY',
    message: 'Sheet contains no data rows',
    severity: 'error' as const
  },

  // Header errors
  HEADER_COLUMN_COUNT_MISMATCH: {
    code: 'HEADER_COLUMN_COUNT_MISMATCH',
    message: `Expected ${EXCEL_STRUCTURE.COLUMNS.length} columns`,
    severity: 'error' as const
  },
  HEADER_COLUMN_ORDER_MISMATCH: {
    code: 'HEADER_COLUMN_ORDER_MISMATCH',
    message: 'Column order does not match template',
    severity: 'error' as const
  },
  HEADER_COLUMN_NAME_MISMATCH: {
    code: 'HEADER_COLUMN_NAME_MISMATCH',
    message: 'Column name does not match template',
    severity: 'error' as const
  },

  // Mandatory field errors
  MANDATORY_FIELD_MISSING: {
    code: 'MANDATORY_FIELD_MISSING',
    message: 'Mandatory field is empty',
    severity: 'error' as const
  },
  ITEM_CODE_INVALID_FORMAT: {
    code: 'ITEM_CODE_INVALID_FORMAT',
    message: 'Item Code contains invalid characters',
    severity: 'error' as const
  },

  // Lookup errors
  ITEM_NOT_FOUND: {
    code: 'ITEM_NOT_FOUND',
    message: 'Item Code does not exist in inventory',
    severity: 'error' as const
  },
  SYSTEM_NOT_FOUND: {
    code: 'SYSTEM_NOT_FOUND',
    message: 'System Code does not exist',
    severity: 'error' as const
  },
  ITEM_SYSTEM_MISMATCH: {
    code: 'ITEM_SYSTEM_MISMATCH',
    message: 'Item and System combination not found',
    severity: 'error' as const
  },

  // Numeric validation errors
  NUMERIC_INVALID: {
    code: 'NUMERIC_INVALID',
    message: 'Value must be a valid number',
    severity: 'error' as const
  },
  ISSUED_QTY_NEGATIVE: {
    code: 'ISSUED_QTY_NEGATIVE',
    message: 'Issued Qty cannot be negative',
    severity: 'error' as const
  },
  CLOSING_STOCK_NEGATIVE: {
    code: 'CLOSING_STOCK_NEGATIVE',
    message: 'Closing Stock cannot be negative',
    severity: 'error' as const
  },
  CLOSING_EXCEEDS_CURRENT: {
    code: 'CLOSING_EXCEEDS_CURRENT',
    message: 'Closing Stock cannot exceed Current Stock',
    severity: 'error' as const
  },
  ISSUED_EXCEEDS_CURRENT: {
    code: 'ISSUED_EXCEEDS_CURRENT',
    message: 'Issued Qty cannot exceed Current Stock',
    severity: 'error' as const
  },

  // Business logic errors
  BOTH_EDITABLE_FIELDS_PROVIDED: {
    code: 'BOTH_EDITABLE_FIELDS_PROVIDED',
    message: 'Provide either Issued Qty or Closing Stock, not both',
    severity: 'error' as const
  },
  NO_EDITABLE_FIELDS_PROVIDED: {
    code: 'NO_EDITABLE_FIELDS_PROVIDED',
    message: 'Either Issued Qty or Closing Stock must be provided',
    severity: 'error' as const
  },
  STOCK_CALCULATION_MISMATCH: {
    code: 'STOCK_CALCULATION_MISMATCH',
    message: 'Closing Stock does not match formula: Current Stock - Issued Qty',
    severity: 'error' as const
  },

  // Duplicate errors
  DUPLICATE_ROW: {
    code: 'DUPLICATE_ROW',
    message: 'Duplicate Item Code + System Code combination',
    severity: 'error' as const
  },

  // Warnings
  CURRENT_STOCK_MISMATCH: {
    code: 'CURRENT_STOCK_MISMATCH',
    message: 'Current Stock in file differs from database',
    severity: 'warning' as const
  },
  CLOSING_STOCK_REACHES_ZERO: {
    code: 'CLOSING_STOCK_REACHES_ZERO',
    message: 'Item will be out of stock after import',
    severity: 'warning' as const
  },
  CLOSING_STOCK_BELOW_MIN: {
    code: 'CLOSING_STOCK_BELOW_MIN',
    message: 'Closing Stock will be below minimum threshold',
    severity: 'warning' as const
  },
  LARGE_QUANTITY_CHANGE: {
    code: 'LARGE_QUANTITY_CHANGE',
    message: 'Unusually large quantity change detected',
    severity: 'warning' as const
  },
} as const

// ============================================================
// FILE VALIDATION
// ============================================================

export async function validateFile(file: File): Promise<{
  isValid: boolean
  errors: ValidationMessage[]
}> {
  const errors: ValidationMessage[] = []

  // Check file type
  if (!file.name.endsWith('.xlsx')) {
    errors.push({
      code: VALIDATION_CODES.FILE_INVALID_TYPE.code,
      message: VALIDATION_CODES.FILE_INVALID_TYPE.message,
      severity: 'error',
      details: { fileName: file.name, expectedType: '.xlsx' }
    })
  }

  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    errors.push({
      code: 'FILE_TOO_LARGE',
      message: 'File size exceeds 10MB limit',
      severity: 'error',
      details: { fileSize: file.size, maxSize: 10 * 1024 * 1024 }
    })
  }

  // Check file is not empty
  if (file.size === 0) {
    errors.push({
      code: VALIDATION_CODES.FILE_EMPTY.code,
      message: VALIDATION_CODES.FILE_EMPTY.message,
      severity: 'error'
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// ============================================================
// HEADER VALIDATION
// ============================================================

export function validateHeaders(actualHeaders: string[]): {
  isValid: boolean
  errors: ValidationMessage[]
} {
  const errors: ValidationMessage[] = []

  // Check column count
  if (actualHeaders.length !== EXCEL_STRUCTURE.COLUMNS.length) {
    errors.push({
      code: VALIDATION_CODES.HEADER_COLUMN_COUNT_MISMATCH.code,
      message: `${VALIDATION_CODES.HEADER_COLUMN_COUNT_MISMATCH.message}, found ${actualHeaders.length}`,
      severity: 'error',
      details: {
        expected: EXCEL_STRUCTURE.COLUMNS.length,
        found: actualHeaders.length
      }
    })
    return { isValid: false, errors }
  }

  // Check exact order and names
  for (let i = 0; i < EXCEL_STRUCTURE.COLUMNS.length; i++) {
    if (actualHeaders[i] !== EXCEL_STRUCTURE.COLUMNS[i]) {
      errors.push({
        code: VALIDATION_CODES.HEADER_COLUMN_NAME_MISMATCH.code,
        message: `Column ${i + 1}: expected "${EXCEL_STRUCTURE.COLUMNS[i]}", found "${actualHeaders[i]}"`,
        severity: 'error',
        field: `Column ${i + 1}`,
        details: {
          position: i + 1,
          expected: EXCEL_STRUCTURE.COLUMNS[i],
          found: actualHeaders[i]
        }
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// ============================================================
// ROW-LEVEL VALIDATION
// ============================================================

export async function validateRow(
  rawRow: any,
  rowNumber: number,
  dbLookup: {
    itemMap: Map<string, { id: string; name: string; stock: number; minStock: number }>
    systemMap: Map<string, { id: string; name: string }>
  }
): Promise<RowValidationResult> {
  const errors: ValidationMessage[] = []
  const warnings: ValidationMessage[] = []

  // Parse fields
  const itemCode = String(rawRow['Item Code'] || '').trim().toUpperCase()
  const systemCode = String(rawRow['System Code'] || '').trim().toUpperCase()
  const itemName = String(rawRow['Item Name'] || '').trim()
  const systemName = String(rawRow['System Name'] || '').trim()
  const currentStockExcel = parseNumeric(rawRow['Current Stock'])
  const issuedQty = parseNumericOrNull(rawRow['Issued Qty'])
  const closingStock = parseNumericOrNull(rawRow['Closing Stock'])
  const unitCost = parseNumeric(rawRow['Unit Cost'])

  // ============================================================
  // MANDATORY FIELD VALIDATION
  // ============================================================

  if (!itemCode) {
    errors.push({
      code: VALIDATION_CODES.MANDATORY_FIELD_MISSING.code,
      message: `${VALIDATION_CODES.MANDATORY_FIELD_MISSING.message}: Item Code`,
      severity: 'error',
      field: 'Item Code'
    })
  }

  if (!systemCode) {
    errors.push({
      code: VALIDATION_CODES.MANDATORY_FIELD_MISSING.code,
      message: `${VALIDATION_CODES.MANDATORY_FIELD_MISSING.message}: System Code`,
      severity: 'error',
      field: 'System Code'
    })
  }

  // ============================================================
  // DATABASE LOOKUP
  // ============================================================

  let currentStockDb: number | null = null
  let itemMinStock = 0

  if (itemCode) {
    const item = dbLookup.itemMap.get(itemCode)
    if (!item) {
      errors.push({
        code: VALIDATION_CODES.ITEM_NOT_FOUND.code,
        message: `${VALIDATION_CODES.ITEM_NOT_FOUND.message}: "${itemCode}"`,
        severity: 'error',
        field: 'Item Code',
        value: itemCode
      })
    } else {
      currentStockDb = item.stock
      itemMinStock = item.minStock
    }
  }

  if (systemCode) {
    const system = dbLookup.systemMap.get(systemCode)
    if (!system) {
      errors.push({
        code: VALIDATION_CODES.SYSTEM_NOT_FOUND.code,
        message: `${VALIDATION_CODES.SYSTEM_NOT_FOUND.message}: "${systemCode}"`,
        severity: 'error',
        field: 'System Code',
        value: systemCode
      })
    }
  }

  // ============================================================
  // NUMERIC VALIDATION
  // ============================================================

  if (currentStockExcel < 0) {
    errors.push({
      code: 'CURRENT_STOCK_NEGATIVE',
      message: 'Current Stock cannot be negative',
      severity: 'error',
      field: 'Current Stock',
      value: currentStockExcel
    })
  }

  if (issuedQty !== null && issuedQty < 0) {
    errors.push({
      code: VALIDATION_CODES.ISSUED_QTY_NEGATIVE.code,
      message: VALIDATION_CODES.ISSUED_QTY_NEGATIVE.message,
      severity: 'error',
      field: 'Issued Qty',
      value: issuedQty
    })
  }

  if (closingStock !== null && closingStock < 0) {
    errors.push({
      code: VALIDATION_CODES.CLOSING_STOCK_NEGATIVE.code,
      message: VALIDATION_CODES.CLOSING_STOCK_NEGATIVE.message,
      severity: 'error',
      field: 'Closing Stock',
      value: closingStock
    })
  }

  // ============================================================
  // BUSINESS LOGIC VALIDATION
  // ============================================================

  // Check editable fields
  const hasIssuedQty = issuedQty !== null
  const hasClosingStock = closingStock !== null

  if (hasIssuedQty && hasClosingStock) {
    // Both provided - validate formula
    const calculatedClosing = currentStockExcel - issuedQty
    if (Math.abs(calculatedClosing - closingStock) > 0.01) {
      errors.push({
        code: VALIDATION_CODES.STOCK_CALCULATION_MISMATCH.code,
        message: VALIDATION_CODES.STOCK_CALCULATION_MISMATCH.message,
        severity: 'error',
        field: 'Closing Stock',
        details: {
          expected: calculatedClosing,
          provided: closingStock,
          formula: `${currentStockExcel} - ${issuedQty}`
        }
      })
    }
  } else if (!hasIssuedQty && !hasClosingStock) {
    errors.push({
      code: VALIDATION_CODES.NO_EDITABLE_FIELDS_PROVIDED.code,
      message: VALIDATION_CODES.NO_EDITABLE_FIELDS_PROVIDED.message,
      severity: 'error',
      details: { itemCode, systemCode }
    })
  }

  // Calculate final closing stock
  let finalClosingStock = closingStock
  if (finalClosingStock === null) {
    if (issuedQty !== null) {
      finalClosingStock = currentStockExcel - issuedQty
    }
  }

  // Validate closing stock
  if (finalClosingStock !== null && finalClosingStock > currentStockExcel) {
    errors.push({
      code: VALIDATION_CODES.CLOSING_EXCEEDS_CURRENT.code,
      message: VALIDATION_CODES.CLOSING_EXCEEDS_CURRENT.message,
      severity: 'error',
      field: 'Closing Stock',
      details: {
        current: currentStockExcel,
        closing: finalClosingStock
      }
    })
  }

  if (issuedQty !== null && issuedQty > currentStockExcel) {
    errors.push({
      code: VALIDATION_CODES.ISSUED_EXCEEDS_CURRENT.code,
      message: VALIDATION_CODES.ISSUED_EXCEEDS_CURRENT.message,
      severity: 'error',
      field: 'Issued Qty',
      details: {
        current: currentStockExcel,
        issued: issuedQty
      }
    })
  }

  // ============================================================
  // WARNINGS (NON-BLOCKING)
  // ============================================================

  // Check stock mismatch
  if (currentStockDb !== null && Math.abs(currentStockExcel - currentStockDb) > 0.01) {
    warnings.push({
      code: VALIDATION_CODES.CURRENT_STOCK_MISMATCH.code,
      message: `${VALIDATION_CODES.CURRENT_STOCK_MISMATCH.message} (DB: ${currentStockDb}, File: ${currentStockExcel})`,
      severity: 'warning',
      field: 'Current Stock',
      details: {
        dbStock: currentStockDb,
        fileStock: currentStockExcel,
        difference: currentStockExcel - currentStockDb
      }
    })
  }

  // Check closing stock reaches zero
  if (finalClosingStock === 0) {
    warnings.push({
      code: VALIDATION_CODES.CLOSING_STOCK_REACHES_ZERO.code,
      message: VALIDATION_CODES.CLOSING_STOCK_REACHES_ZERO.message,
      severity: 'warning',
      field: 'Closing Stock',
      value: finalClosingStock
    })
  }

  // Check below minimum
  if (finalClosingStock !== null && finalClosingStock < itemMinStock && finalClosingStock > 0) {
    warnings.push({
      code: VALIDATION_CODES.CLOSING_STOCK_BELOW_MIN.code,
      message: `${VALIDATION_CODES.CLOSING_STOCK_BELOW_MIN.message} (Min: ${itemMinStock})`,
      severity: 'warning',
      field: 'Closing Stock',
      details: {
        closing: finalClosingStock,
        minimum: itemMinStock
      }
    })
  }

  // Check large quantity change
  if (issuedQty !== null && issuedQty > currentStockExcel * 0.5) {
    warnings.push({
      code: VALIDATION_CODES.LARGE_QUANTITY_CHANGE.code,
      message: `${VALIDATION_CODES.LARGE_QUANTITY_CHANGE.message}: ${((issuedQty / currentStockExcel) * 100).toFixed(1)}% reduction`,
      severity: 'warning',
      field: 'Issued Qty',
      details: {
        percentage: ((issuedQty / currentStockExcel) * 100).toFixed(1)
      }
    })
  }

  return {
    rowNumber,
    isValid: errors.length === 0,
    errors,
    warnings,
    data: {
      itemCode,
      itemName,
      systemCode,
      systemName,
      currentStock: currentStockExcel,
      currentStockDb: currentStockDb,
      issuedQty,
      closingStock: finalClosingStock,
      unitCost,
      stockMismatch: currentStockDb !== null && Math.abs(currentStockExcel - currentStockDb) > 0.01,
      mismatchAmount: currentStockDb !== null ? currentStockExcel - currentStockDb : null
    }
  }
}

// ============================================================
// DUPLICATE DETECTION
// ============================================================

export function detectDuplicates(
  rowValidations: RowValidationResult[]
): Array<{
  itemCode: string
  systemCode: string
  rows: number[]
}> {
  const seen = new Map<string, number[]>()

  for (const row of rowValidations) {
    if (row.data) {
      const key = `${row.data.itemCode}|${row.data.systemCode}`
      if (!seen.has(key)) {
        seen.set(key, [])
      }
      seen.get(key)!.push(row.rowNumber)
    }
  }

  return Array.from(seen.entries())
    .filter(([_, rows]) => rows.length > 1)
    .map(([key, rows]) => {
      const [itemCode, systemCode] = key.split('|')
      return { itemCode, systemCode, rows }
    })
}

// ============================================================
// UTILITIES
// ============================================================

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

// ============================================================
// BUILD LOOKUP MAPS (Performance optimized)
// ============================================================

export async function buildLookupMaps(organizationId: string): Promise<{
  itemMap: Map<string, { id: string; name: string; stock: number; minStock: number }>
  systemMap: Map<string, { id: string; name: string }>
} | null> {
  try {
    // Fetch all items and systems in one query for performance
    const [itemsResult, systemsResult] = await Promise.all([
      supabase
        .from('spares')
        .select('id, name, stock_quantity, min_stock')
        .eq('organization_id', organizationId),
      supabase
        .from('systems')
        .select('id, system_name')
        .eq('organization_id', organizationId)
    ])

    if (itemsResult.error || systemsResult.error) {
      return null
    }

    // Build maps with uppercase keys for case-insensitive matching
    const itemMap = new Map(
      (itemsResult.data || []).map((item: any) => [
        item.name.toUpperCase(),
        {
          id: item.id,
          name: item.name,
          stock: item.stock_quantity,
          minStock: item.min_stock
        }
      ])
    )

    const systemMap = new Map(
      (systemsResult.data || []).map((system: any) => [
        system.system_name.toUpperCase(),
        {
          id: system.id,
          name: system.system_name
        }
      ])
    )

    return { itemMap, systemMap }
  } catch (error) {
    console.error('Failed to build lookup maps:', error)
    return null
  }
}
