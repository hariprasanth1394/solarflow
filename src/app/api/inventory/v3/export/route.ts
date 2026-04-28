import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { withOrganizationContext } from '@/utils/withOrganizationContext'

export const runtime = 'nodejs'

function parseCsvFilter(value: string | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function decodeCategoryId(value: string): string {
  try {
    return Buffer.from(value, 'base64url').toString('utf8').trim()
  } catch {
    return ''
  }
}

function normalizeOne<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] || null) : value
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

type ExportRow = {
  rowType: 'EXISTING'
  spareCode: string
  itemName: string
  category: string
  unit: string
  currentStock: number
  closingStock: number
  unitCost: number
}

type InventoryItemRow = {
  id: string
  item_code: string | null
  item_name: string | null
  category: string | null
  organization_id?: string | null
  is_active?: boolean | null
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
  item?: InventoryItemRow | InventoryItemRow[] | null
  system?: SystemRow | SystemRow[] | null
}

type SpareRow = {
  id?: string
  name: string | null
  category: string | null
  cost_price: number | null
  spare_code: string | null
  stock_quantity: number | null
  unit: string | null
}

type BomRow = {
  system_id: string
  spare_id: string | null
}

export async function GET(request: NextRequest) {
  try {
    return await withOrganizationContext(async (organizationId) => {
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

      const categoryIds = parseCsvFilter(request.nextUrl.searchParams.get('categoryIds'))
      const systemIds = parseCsvFilter(request.nextUrl.searchParams.get('systemIds'))
      const fallbackCategoryNames = parseCsvFilter(request.nextUrl.searchParams.get('categories'))
      const decodedCategoryNames = categoryIds
        .map(decodeCategoryId)
        .filter(Boolean)
      const categoryNamesFilter = (decodedCategoryNames.length > 0 ? decodedCategoryNames : fallbackCategoryNames)
        .map((value) => value.toUpperCase())

      console.info('[inventory.export] incoming_filters', {
        organizationId,
        categoryIds,
        systemIds,
        categoryNamesFilter
      })

      const legacyStockDb = db as any

      const [sparesResult, bomResult] = await Promise.all([
        db
          .from('spares')
          .select('id, spare_code, name, category, unit, cost_price, stock_quantity')
          .eq('organization_id', organizationId),
        legacyStockDb
          .from('system_components')
          .select('system_id, spare_id')
          .eq('organization_id', organizationId)
      ])

      if (sparesResult.error) throw sparesResult.error
      if (bomResult.error) throw bomResult.error

      const spares = (sparesResult.data || []) as unknown as SpareRow[]
      const bomRows = (bomResult.data || []) as unknown as BomRow[]
      const allowedSpareIds = systemIds.length > 0
        ? new Set(bomRows.filter((row) => systemIds.includes(row.system_id)).map((row) => row.spare_id).filter(Boolean))
        : null

      const exportRows: ExportRow[] = spares
        .filter((spare) => {
          const category = String(spare.category || '').trim()
          const categoryOk = categoryNamesFilter.length === 0 || categoryNamesFilter.includes(category.toUpperCase())
          const systemOk = !allowedSpareIds || (spare.id ? allowedSpareIds.has(spare.id) : false)
          return categoryOk && systemOk
        })
        .map((spare) => {
          const currentStock = Number(spare.stock_quantity || 0)
          return {
            rowType: 'EXISTING',
            spareCode: String(spare.spare_code || '').trim(),
            itemName: String(spare.name || '').trim(),
            category: String(spare.category || '').trim(),
            unit: String(spare.unit || 'Nos').trim(),
            currentStock,
            closingStock: currentStock,
            unitCost: Number(spare.cost_price || 0)
          }
        })

      if (exportRows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NO_DATA',
              message: 'No data available for selected filters'
            }
          },
          { status: 404 }
        )
      }

      const categoryList = [...new Set(exportRows.map((row) => row.category).filter(Boolean))].sort((a, b) => a.localeCompare(b))
      const workbook = new ExcelJS.Workbook()
      const dataSheet = workbook.addWorksheet('Inventory_Import')
      const masterSheet = workbook.addWorksheet('Master_Data')
      const instructionsSheet = workbook.addWorksheet('Instructions')

      const headers = [
        'Row Type',
        'Spare Code',
        'Item Name',
        'Category',
        'Unit',
        'Current Stock',
        'Final Stock',
        'Unit Cost'
      ]

      dataSheet.addRow(headers)

      exportRows.forEach((row) => {
        dataSheet.addRow([
          row.rowType,
          row.spareCode,
          row.itemName,
          row.category,
          row.unit,
          row.currentStock,
          row.closingStock,
          row.unitCost
        ])
      })

      masterSheet.addRow(['Categories'])
      categoryList.forEach((value) => masterSheet.addRow([value]))
      const categoryEnd = Math.max(2, masterSheet.rowCount)

      const lastDataRow = dataSheet.rowCount
      for (let row = 2; row <= lastDataRow; row++) {
        dataSheet.getCell(`D${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`Master_Data!$A$2:$A$${categoryEnd}`]
        }

        // Only Final Stock (column G) stays editable in Excel.
        ;['A', 'B', 'C', 'D', 'E', 'F', 'H'].forEach((column) => {
          dataSheet.getCell(`${column}${row}`).protection = { locked: true }
        })
        ;['G'].forEach((column) => {
          dataSheet.getCell(`${column}${row}`).protection = { locked: false }
        })
      }

      instructionsSheet.addRow(['Inventory Import Instructions'])
      instructionsSheet.addRow(['Do not edit Spare Code. It is the stable primary identifier used for updates.'])
      instructionsSheet.addRow(['Rows with empty Spare Code are treated as NEW inserts and will receive a generated Spare Code.'])
      instructionsSheet.addRow(['Only edit Final Stock. All other columns are read-only reference data.'])
      instructionsSheet.addRow(['Final Stock is the only value required for updates. Difference is auto-calculated: Final Stock − Current Stock.'])
      instructionsSheet.columns = [{ width: 120 }]
      await dataSheet.protect('', { selectLockedCells: true, selectUnlockedCells: true })

      headers.forEach((header, index) => {
        const cell = dataSheet.getCell(1, index + 1)
        cell.value = header
        cell.font = { bold: true }
      })

      dataSheet.columns = [
        { width: 12 },
        { width: 18 },
        { width: 28 },
        { width: 14 },
        { width: 12 },
        { width: 14 },
        { width: 14 },
        { width: 14 }
      ]

      const buffer = await workbook.xlsx.writeBuffer()
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="inventory-export-template.xlsx"',
          'Cache-Control': 'no-store'
        }
      })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to export inventory data'
        const lower = message.toLowerCase()
        const status = lower.includes('not authenticated')
          ? 401
          : lower.includes('organization not found')
            ? 404
            : 500

        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'EXPORT_FAILED',
              message
            }
          },
          { status }
        )
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export inventory data'
    const lower = message.toLowerCase()
    const status = lower.includes('not authenticated')
      ? 401
      : lower.includes('organization not found')
        ? 404
        : 500

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message
        }
      },
      { status }
    )
  }
}
