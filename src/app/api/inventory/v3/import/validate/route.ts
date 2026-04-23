import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { withOrganizationContext } from '@/utils/withOrganizationContext'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

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
  'Item Code',
  'Item Name',
  'Category',
  'System Code',
  'System Name',
  'Current Stock',
  'Issued Qty',
  'Closing Stock',
  'Unit Cost'
]

type PreviewRow = {
  rowNumber: number
  itemCode: string
  itemName: string
  category: string
  unit: string
  systemCode: string
  systemName: string
  currentStock: number
  importedStock: number
  difference: number
  status: 'NEW' | 'UPDATED' | 'UNCHANGED' | 'ERROR'
  errors: Array<{ column: string; message: string }>
}

type InventoryItemRow = {
  id: string
  item_code: string | null
  item_name: string | null
  category: string | null
  unit: string | null
}

type SystemRow = {
  id: string
  system_name: string | null
  system_code: string | null
}

type StockRow = {
  item_id: string
  system_id: string
  quantity: number | null
}

type StockSystemRow = {
  system: SystemRow | SystemRow[] | null
}

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

function normalizeSystemKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function normalizeOne<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] || null) : value
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

      const legacyStockDb = db as any

      const [itemsResult, systemsResult, stockResult, stockSystemsResult] = await Promise.all([
        legacyStockDb
          .from('inventory_items')
          .select('id, item_code, item_name, category, unit')
          .eq('organization_id', organizationId)
          .neq('is_active', false),
        db
          .from('systems')
          .select('id, system_name, system_code')
          .eq('organization_id', organizationId),
        legacyStockDb
          .from('inventory_stock')
          .select('item_id, system_id, quantity')
          .eq('organization_id', organizationId),
        legacyStockDb
          .from('inventory_stock')
          .select('system:systems(id, system_name, system_code)')
          .eq('organization_id', organizationId)
      ])

      if (itemsResult.error) throw itemsResult.error
      if (systemsResult.error) throw systemsResult.error
      if (stockResult.error) throw stockResult.error
      if (stockSystemsResult.error) throw stockSystemsResult.error

      const items = (itemsResult.data || []) as unknown as InventoryItemRow[]
      const systemsFromTable = (systemsResult.data || []) as unknown as SystemRow[]
      const stock = (stockResult.data || []) as unknown as StockRow[]
      const stockSystemsRows = (stockSystemsResult.data || []) as unknown as StockSystemRow[]

      const systemsMap = new Map<string, SystemRow>()
      systemsFromTable.forEach((system) => {
        systemsMap.set(system.id, system)
      })
      stockSystemsRows.forEach((row) => {
        const system = normalizeOne(row.system)
        if (system?.id) {
          systemsMap.set(system.id, system)
        }
      })
      const systems = Array.from(systemsMap.values())

      console.info('[inventory.import.validate] reference_rows_loaded', {
        organizationId,
        itemCount: items.length,
        systemCount: systems.length,
        stockCount: stock.length,
        sourceSystemCount: systemsFromTable.length,
        stockJoinSystemCount: stockSystemsRows.length
      })

      const itemMap = new Map(items.map((item) => [String(item.item_code || '').toUpperCase(), item]))
      const itemNameMap = new Map(items.map((item) => [String(item.item_name || '').toUpperCase(), item]))
      const systemCodeMap = new Map(
        systems.map((system) => [String(system.system_code || '').toUpperCase(), system])
      )
      const systemNameMap = new Map(
        systems.map((system) => [String(system.system_name || '').toUpperCase(), system])
      )
      const systemNormalizedMap = new Map<string, SystemRow>()
      systems.forEach((system) => {
        const codeKey = normalizeSystemKey(String(system.system_code || ''))
        const nameKey = normalizeSystemKey(String(system.system_name || ''))
        if (codeKey) systemNormalizedMap.set(codeKey, system)
        if (nameKey) systemNormalizedMap.set(nameKey, system)
      })

      const stockMap = new Map<string, number>()
      stock.forEach((row) => {
        stockMap.set(`${row.item_id}:${row.system_id}`, Number(row.quantity || 0))
      })

      const previewRows: PreviewRow[] = []

      rows.forEach((row, index) => {
        const rowNumber = index + 2
        const itemCode = String(row['Item Code'] || '').trim().toUpperCase()
        const itemName = String(row['Item Name'] || '').trim()
        const category = String(row['Category'] || '').trim()
        const unit = String(row['Unit'] || '').trim()
        const systemCode = String(row['System Code'] || '').trim().toUpperCase()
        const systemName = String(row['System Name'] || '').trim()
        const normalizedSystemCode = normalizeSystemKey(systemCode)
        const normalizedSystemName = normalizeSystemKey(systemName)

        const currentStock = parseNum(row['Current Stock'])
        const issuedQty = parseNum(row['Issued Qty'])
        const closingStock = parseNum(row['Closing Stock'])

        const errors: Array<{ column: string; message: string }> = []

        if (!itemCode) errors.push({ column: 'Item Code', message: 'Item Code is required' })
        if (!itemName) errors.push({ column: 'Item Name', message: 'Item Name is required' })
        if (!systemCode && !systemName) errors.push({ column: 'System Code', message: 'System Code or System Name is required' })
        if (currentStock === null) errors.push({ column: 'Current Stock', message: 'Current Stock must be numeric' })

        if (issuedQty === null && closingStock === null) {
          errors.push({ column: 'Issued Qty/Closing Stock', message: 'Either Issued Qty or Closing Stock is required' })
        }

        if ((issuedQty ?? 0) < 0) errors.push({ column: 'Issued Qty', message: 'Issued Qty cannot be negative' })
        if ((closingStock ?? 0) < 0) errors.push({ column: 'Closing Stock', message: 'Closing Stock cannot be negative' })
        if ((currentStock ?? 0) < 0) errors.push({ column: 'Current Stock', message: 'Current Stock cannot be negative' })

        const resolvedClosing = closingStock !== null
          ? closingStock
          : (currentStock !== null && issuedQty !== null ? currentStock - issuedQty : 0)

        if (currentStock !== null && issuedQty !== null && closingStock !== null) {
          const expected = currentStock - issuedQty
          if (Math.abs(expected - closingStock) > 0.01) {
            errors.push({ column: 'Closing Stock', message: 'Closing Stock must equal Current Stock - Issued Qty' })
          }
        }

        const item = itemMap.get(itemCode) || itemNameMap.get(itemName.toUpperCase()) || null
        const system =
          systemCodeMap.get(systemCode) ||
          systemNameMap.get(systemCode) ||
          systemCodeMap.get(systemName.toUpperCase()) ||
          systemNameMap.get(systemName.toUpperCase()) ||
          (normalizedSystemCode ? systemNormalizedMap.get(normalizedSystemCode) : null) ||
          (normalizedSystemName ? systemNormalizedMap.get(normalizedSystemName) : null) ||
          null

        if (!system) {
          const debugValue = systemCode || systemName || 'EMPTY'
          errors.push({ column: 'System Code', message: `Unknown system: ${debugValue}. Check that the system name or code matches your database.` })
        }

        const resolvedSystemCode = String(system?.system_code || system?.system_name || systemCode || '').trim().toUpperCase()
        const resolvedSystemName = String(system?.system_name || systemName || '').trim()

        const dbCurrentStock = item && system
          ? Number(stockMap.get(`${item.id}:${system.id}`) || 0)
          : Number(currentStock || 0)

        const importedStock = Number(resolvedClosing || 0)
        const difference = importedStock - dbCurrentStock

        let status: PreviewRow['status'] = 'UNCHANGED'
        if (errors.length > 0) {
          status = 'ERROR'
        } else if (!item) {
          status = 'NEW'
        } else if (Math.abs(difference) > 0.01) {
          status = 'UPDATED'
        }

        if (category === '') {
          errors.push({ column: 'Category', message: 'Category is required' })
          status = 'ERROR'
        }

        previewRows.push({
          rowNumber,
          itemCode,
          itemName,
          category,
          unit,
          systemCode: resolvedSystemCode,
          systemName: resolvedSystemName,
          currentStock: dbCurrentStock,
          importedStock,
          difference,
          status,
          errors
        })
      })

      const summary = {
        totalRows: previewRows.length,
        newRows: previewRows.filter((row) => row.status === 'NEW').length,
        updatedRows: previewRows.filter((row) => row.status === 'UPDATED').length,
        unchangedRows: previewRows.filter((row) => row.status === 'UNCHANGED').length,
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
            rows: previewRows
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
