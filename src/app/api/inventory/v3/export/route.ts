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
  itemCode: string
  itemName: string
  category: string
  systemCode: string
  systemName: string
  currentStock: number
  issuedQty: number
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
  stock_quantity: number | null
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

      const [sparesResult, stockResult] = await Promise.all([
        db
          .from('spares')
          .select('id, name, category, cost_price, stock_quantity')
          .eq('organization_id', organizationId),
        (systemIds.length > 0
          ? legacyStockDb
              .from('inventory_stock')
              .select('item_id, system_id, quantity, item:inventory_items(id, item_code, item_name, category, organization_id, is_active), system:systems(id, system_name, system_code)')
              .eq('organization_id', organizationId)
              .in('system_id', systemIds)
          : legacyStockDb
              .from('inventory_stock')
              .select('item_id, system_id, quantity, item:inventory_items(id, item_code, item_name, category, organization_id, is_active), system:systems(id, system_name, system_code)')
              .eq('organization_id', organizationId))
      ])

      if (sparesResult.error) throw sparesResult.error
      if (stockResult.error) throw stockResult.error

      const stockRows = (stockResult.data || []) as unknown as StockRow[]
      const spares = (sparesResult.data || []) as unknown as SpareRow[]
      const spareMap = new Map(spares.map((spare) => [String(spare.name || '').toUpperCase(), spare]))

      console.info('[inventory.export] joined_rows_loaded', {
        organizationId,
        stockRowCount: stockRows.length,
        spareCount: spares.length
      })

      let exportRows: ExportRow[] = stockRows
        .map((stock) => {
          const item = normalizeOne(stock.item)
          const system = normalizeOne(stock.system)
          if (!item || !system) return null
          if (item.is_active === false) return null
          if (item.organization_id && item.organization_id !== organizationId) return null

          const category = String(item.category || '').trim()
          if (categoryNamesFilter.length > 0 && !categoryNamesFilter.includes(category.toUpperCase())) {
            return null
          }

          const itemCode = String(item.item_code || '').trim()
          const itemName = String(item.item_name || '').trim()
          const currentStock = Number(stock.quantity || 0)
          const unitCost = Number(spareMap.get(itemName.toUpperCase())?.cost_price || 0)

          return {
            rowType: 'EXISTING',
            itemCode,
            itemName,
            category,
            systemCode: String(system.system_code || system.system_name || ''),
            systemName: String(system.system_name || ''),
            currentStock,
            issuedQty: 0,
            closingStock: currentStock,
            unitCost
          }
        })
        .filter(Boolean) as ExportRow[]

      console.info('[inventory.export] filtered_rows', {
        organizationId,
        filteredCount: exportRows.length
      })

      if (exportRows.length === 0) {
        const [legacySystemsResult, bomResult] = await Promise.all([
          db
            .from('systems')
            .select('id, system_name, system_code')
            .eq('organization_id', organizationId),
          db
            .from('system_components')
            .select('system_id, spare_id')
            .eq('organization_id', organizationId)
        ])

        if (legacySystemsResult.error) throw legacySystemsResult.error
        if (bomResult.error) throw bomResult.error

        const legacySystems = (legacySystemsResult.data || []) as unknown as SystemRow[]
        const legacySystemMap = new Map(legacySystems.map((row) => [row.id, row]))
        const spareById = new Map(spares.map((spare) => [spare.id, spare]))

        exportRows = ((bomResult.data || []) as unknown as BomRow[])
          .map((row) => {
            const system = legacySystemMap.get(row.system_id)
            const spare = row.spare_id ? spareById.get(row.spare_id) : null
            if (!system || !spare) return null

            const systemCode = String(system.system_code || system.system_name || '')
            const systemName = String(system.system_name || '')
            const category = String(spare.category || '').trim()

            if (systemIds.length > 0 && !systemIds.includes(system.id)) {
              return null
            }
            if (categoryNamesFilter.length > 0 && !categoryNamesFilter.includes(category.toUpperCase())) {
              return null
            }

            const currentStock = Number(spare.stock_quantity || 0)
            return {
              rowType: 'EXISTING',
              itemCode: String(spare.name || '').toUpperCase(),
              itemName: String(spare.name || ''),
              category,
              systemCode,
              systemName,
              currentStock,
              issuedQty: 0,
              closingStock: currentStock,
              unitCost: Number(spare.cost_price || 0)
            }
          })
          .filter(Boolean) as ExportRow[]
      }

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
      const systemCodeList = [...new Set(exportRows.map((row) => row.systemCode).filter(Boolean))].sort((a, b) => a.localeCompare(b))
      const systemNameList = [...new Set(exportRows.map((row) => row.systemName).filter(Boolean))].sort((a, b) => a.localeCompare(b))

      const workbook = new ExcelJS.Workbook()
      const dataSheet = workbook.addWorksheet('Inventory_Import')
      const masterSheet = workbook.addWorksheet('Master_Data')

      const headers = [
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

      dataSheet.addRow(headers)

      exportRows.forEach((row) => {
        dataSheet.addRow([
          row.rowType,
          row.itemCode,
          row.itemName,
          row.category,
          row.systemCode,
          row.systemName,
          row.currentStock,
          row.issuedQty,
          row.closingStock,
          row.unitCost
        ])
      })

      masterSheet.addRow(['Categories'])
      categoryList.forEach((value) => masterSheet.addRow([value]))
      const categoryEnd = Math.max(2, masterSheet.rowCount)

      masterSheet.getCell('C1').value = 'Systems'
      systemCodeList.forEach((value, index) => {
        masterSheet.getCell(`C${index + 2}`).value = value
      })
      const systemCodeEnd = Math.max(2, systemCodeList.length + 1)

      masterSheet.getCell('E1').value = 'System Names'
      systemNameList.forEach((value, index) => {
        masterSheet.getCell(`E${index + 2}`).value = value
      })
      const systemNameEnd = Math.max(2, systemNameList.length + 1)

      const lastDataRow = dataSheet.rowCount
      for (let row = 2; row <= lastDataRow; row++) {
        dataSheet.getCell(`D${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`Master_Data!$A$2:$A$${categoryEnd}`]
        }
        dataSheet.getCell(`E${row}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`Master_Data!$C$2:$C$${systemCodeEnd}`]
        }
        dataSheet.getCell(`F${row}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`Master_Data!$E$2:$E$${systemNameEnd}`]
        }
      }

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
        { width: 18 },
        { width: 26 },
        { width: 14 },
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
