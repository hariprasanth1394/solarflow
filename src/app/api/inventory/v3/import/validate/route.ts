import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { withOrganizationContext } from '@/utils/withOrganizationContext'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { makeSpareCodeKey, normalize } from '@/lib/inventoryImportNormalize'

export const runtime = 'nodejs'

const LEGACY_COLUMNS = [
  'Item Code',
  'Item Name',
  'Category',
  'Unit',
  'System Code',
  'System Name',
  'Current Stock',
  'Issued Qty',
  'Closing Stock',
  'Status'
]

const V3_COLUMNS = [
  'Row Type',
  'Spare Code',
  'Item Name',
  'Category',
  'Unit',
  'Current Stock',
  'Final Stock',
  'Unit Cost'
]

type PreviewRow = {
  rowNumber: number
  spareCode: string
  itemName: string
  category: string
  unit: string
  currentStock: number
  importedStock: number
  difference: number
  status: 'NEW' | 'UPDATE' | 'NO CHANGE' | 'ERROR'
  errors: Array<{ column: string; message: string }>
  warnings: Array<{ column: string; message: string }>
  matchFound: boolean
  adjustmentReason?: string | null
}

type DbMatchRow = {
  spare_code: string
  current_stock: number
}

type SpareRow = Database['public']['Tables']['spares']['Row']

async function getRequestClient(): Promise<SupabaseClient<Database> | null> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  const accessToken = token ? decodeURIComponent(token) : null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    return null
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
}

function parseNum(raw: unknown): number | null {
  if (raw === '' || raw === null || raw === undefined) return null
  const value = parseFloat(String(raw).trim())
  return Number.isNaN(value) ? null : value
}

function columnsMatch(actual: string[], expected: string[]): boolean {
  if (actual.length !== expected.length) return false
  return expected.every((column, index) => column === actual[index])
}

export async function POST(request: NextRequest) {
  return withOrganizationContext(async (organizationId) => {
    try {
      const db = await getRequestClient()
      if (!db) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'User not authenticated'
            }
          },
          { status: 401 }
        )
      }
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FILE_MISSING',
              message: 'Upload file is required'
            }
          },
          { status: 400 }
        )
      }

      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheet = workbook.Sheets['Inventory_Import'] || workbook.Sheets[workbook.SheetNames[0]]

      if (!sheet) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_FILE',
              message: 'No valid worksheet found'
            }
          },
          { status: 400 }
        )
      }

      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Array<Record<string, unknown>>
      const first = rows[0] || {}
      const columns = Object.keys(first)
      const isLegacyTemplate = columnsMatch(columns, LEGACY_COLUMNS)
      const isV3Template = columnsMatch(columns, V3_COLUMNS)

      if (!isLegacyTemplate && !isV3Template) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_TEMPLATE',
              message: `Expected columns: ${V3_COLUMNS.join(', ')} or ${LEGACY_COLUMNS.join(', ')}`
            }
          },
          { status: 400 }
        )
      }

      const { data: spares, error: sparesError } = await db
        .from('spares')
        .select('id, spare_code, name, category, unit, stock_quantity, cost_price')
        .eq('organization_id', organizationId)

      if (sparesError) throw sparesError

      const typedSpares = (spares || []) as SpareRow[]
      const spareByCode = new Map(typedSpares.map((spare) => [makeSpareCodeKey(spare.spare_code), spare]))
      const dbItems: DbMatchRow[] = typedSpares.map((spare) => ({
        spare_code: spare.spare_code,
        current_stock: Number(spare.stock_quantity || 0)
      }))

      const previewRows: PreviewRow[] = []

      rows.forEach((row, index) => {
        const rowNumber = index + 2
        const rawSpareCode = String(row['Spare Code'] || '').trim()
        const rawItemName = String(row['Item Name'] || '').trim()
        const itemName = rawItemName
        const category = String(row['Category'] || '').trim()
        const unit = String(row['Unit'] || '').trim()
        const spareCode = rawSpareCode.toUpperCase()

        const normalizedSpareCode = makeSpareCodeKey(rawSpareCode)

        const currentStock = parseNum(row['Current Stock'])
        const closingStock = parseNum(row['Final Stock'])

        const errors: Array<{ column: string; message: string }> = []

        if (!itemName && !spareCode) errors.push({ column: 'Item Name', message: 'Item Name is required for new spare rows' })

        if (closingStock === null) {
          errors.push({ column: 'Final Stock', message: 'Final Stock is required' })
        }

        if ((closingStock ?? 0) < 0) errors.push({ column: 'Final Stock', message: 'Final Stock cannot be negative' })
        if ((currentStock ?? 0) < 0) errors.push({ column: 'Current Stock', message: 'Current Stock cannot be negative' })

        const resolvedCurrentStock = currentStock ?? 0
        const resolvedClosing = closingStock ?? 0

        const warnings: Array<{ column: string; message: string }> = []

        const matchedSpare = normalizedSpareCode ? spareByCode.get(normalizedSpareCode) || null : null
        const matchFound = !!matchedSpare
        const dbCurrentStock = matchedSpare
          ? Number(matchedSpare.stock_quantity || 0)
          : Number(resolvedCurrentStock || 0)

        const importedStock = Number(resolvedClosing || 0)
        const difference = importedStock - dbCurrentStock

        if (spareCode && !matchFound) {
          errors.push({ column: 'Spare Code', message: 'Spare Code not found. Export a fresh template before importing updates.' })
        }

        let status: PreviewRow['status'] = 'NO CHANGE'
        if (errors.length > 0) {
          status = 'ERROR'
        } else if (!spareCode) {
          status = 'NEW'
        } else if (Math.abs(difference) > 0.01) {
          status = 'UPDATE'
        }

        console.log('[inventory.import.validate] row_processed', {
          rowNumber,
          spareCode,
          normalizedSpareCode,
          matched: matchFound,
          matchFound,
          status,
          resolvedClosing
        })

        previewRows.push({
          rowNumber,
          spareCode,
          itemName,
          category,
          unit,
          currentStock: dbCurrentStock,
          importedStock,
          difference,
          status,
          errors,
          warnings,
          matchFound,
          adjustmentReason: null
        })
      })

      const summary = {
        totalRows: previewRows.length,
        newRows: previewRows.filter((row) => row.status === 'NEW').length,
        updatedRows: previewRows.filter((row) => row.status === 'UPDATE').length,
        unchangedRows: previewRows.filter((row) => row.status === 'NO CHANGE').length,
        errorRows: previewRows.filter((row) => row.status === 'ERROR').length,
        hasBlockingErrors: previewRows.some((row) => row.status === 'ERROR')
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            fileName: file.name,
            batchKey: crypto.randomUUID(),
            summary,
            rows: previewRows,
            dbItems
          }
        },
        { status: 200 }
      )
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: error instanceof Error ? error.message : 'Failed to validate import file'
          }
        },
        { status: 500 }
      )
    }
  })
}
