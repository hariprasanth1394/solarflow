import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { withOrganizationContext } from '@/utils/withOrganizationContext'
import { getRequestContext } from '@/lib/orgContext'
import { makeSpareCodeKey, normalize } from '@/lib/inventoryImportNormalize'

export const runtime = 'nodejs'

type ConfirmRow = {
  rowNumber?: number
  spareCode?: string
  itemName?: string
  unit?: string
  category?: string
  closingStock?: number
  currentStock?: number
  unitCost?: number
  importStatus?: string
  status?: string
  errors?: unknown[]
}

type InventoryItemLookupRow = {
  id: string
  item_code: string | null
  item_name: string | null
  category: string | null
  is_active?: boolean | null
}

type AvailabilityRow = {
  system_id: string
  available_count: number | null
  limiting_item: string | null
  systems:
    | {
        system_name: string | null
      }
    | {
        system_name: string | null
      }[]
    | null
}

function normalizeOne<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] || null) : value
}

function parseNumber(value: unknown): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function generateSpareCode(): string {
  return `SPR-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`
}

function getRowIdentity(row: ConfirmRow): string {
  return `${String(row.itemName || '').trim().toUpperCase()}::${String(row.category || '').trim().toUpperCase()}`
}

function buildCanonicalDesiredStock(rows: ConfirmRow[]): Map<string, number> {
  const grouped = new Map<string, ConfirmRow[]>()

  for (const row of rows) {
    const rowStatus = String(row.importStatus || row.status || '').toUpperCase()
    if (rowStatus === 'ERROR') continue
    const key = getRowIdentity(row)
    if (!key || key === '::') continue
    const list = grouped.get(key) || []
    list.push(row)
    grouped.set(key, list)
  }

  const canonical = new Map<string, number>()

  for (const [key, groupRows] of grouped.entries()) {
    const changedRows = groupRows.filter((row) => {
      const status = String(row.importStatus || row.status || '').toUpperCase()
      return status === 'UPDATED' || status === 'NEW'
    })

    const sourceRow = changedRows[0] || groupRows[0]
    canonical.set(key, parseNumber(sourceRow.closingStock))
  }

  return canonical
}

async function syncSpareStockFromRows(
  db: SupabaseClient<Database>,
  organizationId: string,
  rows: ConfirmRow[]
): Promise<{ syncedCount: number }> {
  const { data: spareRows, error } = await db
    .from('spares')
    .select('id, name, category, stock_quantity')
    .eq('organization_id', organizationId)

  if (error) throw error

  const spareKeyMap = new Map(
    (spareRows || []).map((spare) => [
      `${String(spare.name || '').trim().toUpperCase()}::${String(spare.category || '').trim().toUpperCase()}`,
      spare
    ])
  )
  const spareNameMap = new Map(
    (spareRows || []).map((spare) => [String(spare.name || '').trim().toUpperCase(), spare])
  )

  const canonicalDesiredStock = buildCanonicalDesiredStock(rows)
  const desiredStockBySpare = new Map<string, { spareId: string; quantity: number }>()

  for (const [identity, quantity] of canonicalDesiredStock.entries()) {
    const [itemNameKey, categoryKey] = identity.split('::')
    const spare = spareKeyMap.get(`${itemNameKey}::${categoryKey}`) || spareNameMap.get(itemNameKey)
    if (!spare) continue

    desiredStockBySpare.set(spare.id, {
      spareId: spare.id,
      quantity
    })
  }

  let syncedCount = 0

  for (const spare of spareRows || []) {
    const desired = desiredStockBySpare.get(spare.id)
    if (!desired) continue

    const nextQuantity = desired.quantity
    if (Number(spare.stock_quantity || 0) === nextQuantity) continue

    const { error: updateError } = await db
      .from('spares')
      .update({ stock_quantity: nextQuantity })
      .eq('id', desired.spareId)
      .eq('organization_id', organizationId)

    if (updateError) throw updateError
    syncedCount += 1
  }

  return { syncedCount }
}

async function syncSpareStockFromInventory(
  db: SupabaseClient<Database>,
  organizationId: string
): Promise<{ syncedCount: number }> {
  const legacyDb = db as any

  const [itemsResult, stockResult, sparesResult] = await Promise.all([
    legacyDb
      .from('inventory_items')
      .select('id, item_name, category, unit')
      .eq('organization_id', organizationId)
      .neq('is_active', false),
    legacyDb
      .from('inventory_stock')
      .select('item_id, quantity')
      .eq('organization_id', organizationId),
    db
      .from('spares')
      .select('id, name, category, stock_quantity')
      .eq('organization_id', organizationId)
  ])

  if (itemsResult.error) throw itemsResult.error
  if (stockResult.error) throw stockResult.error
  if (sparesResult.error) throw sparesResult.error

  const items = itemsResult.data || []
  const stockRows = stockResult.data || []
  const spareRows = sparesResult.data || []

  const totalByItemId = new Map<string, number>()
  stockRows.forEach((row: { item_id: string; quantity: number | null }) => {
    const current = totalByItemId.get(row.item_id) || 0
    totalByItemId.set(row.item_id, current + Number(row.quantity || 0))
  })

  const spareByNameCategory = new Map(
    spareRows.map((spare) => [
      `${String(spare.name || '').trim().toUpperCase()}::${String(spare.category || '').trim().toUpperCase()}`,
      spare
    ])
  )
  const spareByName = new Map(
    spareRows.map((spare) => [String(spare.name || '').trim().toUpperCase(), spare])
  )

  let syncedCount = 0

  for (const item of items) {
    const itemName = String(item.item_name || '').trim()
    if (!itemName) continue

    const itemCategory = String(item.category || '').trim()
    const desiredQty = Number(totalByItemId.get(item.id) || 0)
    const identity = `${itemName.toUpperCase()}::${itemCategory.toUpperCase()}`
    const spare = spareByNameCategory.get(identity) || spareByName.get(itemName.toUpperCase())

    if (!spare) {
      const { error: insertError } = await db
        .from('spares')
        .insert({
          organization_id: organizationId,
          name: itemName,
          category: itemCategory || null,
          unit: String(item.unit || 'Nos'),
          stock_quantity: desiredQty,
          min_stock: 0,
          cost_price: 0
        })
      if (insertError) throw insertError
      syncedCount += 1
      continue
    }

    if (Number(spare.stock_quantity || 0) === desiredQty) {
      continue
    }

    const { error: updateError } = await db
      .from('spares')
      .update({ stock_quantity: desiredQty })
      .eq('id', spare.id)
      .eq('organization_id', organizationId)
    if (updateError) throw updateError
    syncedCount += 1
  }

  return { syncedCount }
}

async function syncInventoryStockQuantities(
  db: SupabaseClient<Database>,
  organizationId: string,
  rows: ConfirmRow[]
): Promise<{ syncedCount: number }> {
  const canonicalDesiredStock = buildCanonicalDesiredStock(rows)
  if (canonicalDesiredStock.size === 0) {
    return { syncedCount: 0 }
  }

  const legacyDb = db as any

  const { data: itemRows, error } = await legacyDb
    .from('inventory_items')
    .select('id, item_code, item_name, category, is_active')
    .eq('organization_id', organizationId)
    .neq('is_active', false)

  if (error) throw error

  const itemMap = new Map(
    ((itemRows || []) as InventoryItemLookupRow[]).map((item) => [
      `${String(item.item_name || '').trim().toUpperCase()}::${String(item.category || '').trim().toUpperCase()}`,
      item
    ])
  )

  let syncedCount = 0

  for (const [identity, quantity] of canonicalDesiredStock.entries()) {
    const item = itemMap.get(identity)
    if (!item) continue

    const { error: updateError, count } = await legacyDb
      .from('inventory_stock')
      .update({ quantity })
      .eq('organization_id', organizationId)
      .eq('item_id', item.id)
      .select('item_id', { count: 'exact' })

    if (updateError) throw updateError
    syncedCount += count || 0
  }

  return { syncedCount }
}

async function applyImportRows(
  db: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
  rows: ConfirmRow[]
): Promise<{
  appliedRows: number
  skippedRows: number
  insertedRows: number
  updatedRows: number
  affectedSpareCodes: string[]
  errors: Array<{ row: number; reason: string }>
}> {
  const { data: spares, error: sparesError } = await db
    .from('spares')
    .select('id, spare_code, name, category, unit, stock_quantity, cost_price, min_stock, supplier_id')
    .eq('organization_id', organizationId)

  if (sparesError) throw sparesError

  const spareByCode = new Map((spares || []).map((spare) => [makeSpareCodeKey(spare.spare_code), spare]))

  let appliedRows = 0
  let skippedRows = 0
  let insertedRows = 0
  let updatedRows = 0
  const affectedSpareCodes = new Set<string>()
  const rowErrors: Array<{ row: number; reason: string }> = []

  for (const row of rows) {
    const rowNumber = row.rowNumber ?? 0
    const normalizedSpareCode = makeSpareCodeKey(row.spareCode)
    const itemName = String(row.itemName || '').trim()
    const category = String(row.category || '').trim() || null
    const unit = String(row.unit || '').trim() || 'Nos'
    const unitCost = parseNumber(row.unitCost)
    const existingSpare = normalizedSpareCode ? spareByCode.get(normalizedSpareCode) || null : null
    const targetQty = Number(row.closingStock)

    console.log('[inventory.import.confirm] processing_row', {
      rowNumber,
      spareCode: String(row.spareCode || '').trim(),
      normalizedSpareCode,
      matched: !!existingSpare
    })

    if (!Number.isFinite(targetQty) || targetQty < 0) {
      skippedRows += 1
      rowErrors.push({ row: rowNumber, reason: 'Invalid stock value' })
      continue
    }

    if (!existingSpare && !itemName) {
      skippedRows += 1
      rowErrors.push({ row: rowNumber, reason: 'Missing required field: Item Name' })
      continue
    }

    console.log('[inventory.import.confirm] row_match_check', {
      spareCode: String(row.spareCode || '').trim(),
      normalizedSpareCode,
      matched: !!existingSpare
    })

    try {
      if (existingSpare && Number(existingSpare.stock_quantity || 0) === targetQty) {
        continue
      }

      const spareCode = existingSpare?.spare_code || generateSpareCode()
      const { data: upsertedSpare, error: upsertError } = await db
        .from('spares')
        .upsert(
          {
            organization_id: organizationId,
            spare_code: spareCode,
            name: existingSpare?.name || itemName,
            category: existingSpare?.category || category,
            unit: existingSpare?.unit || unit,
            stock_quantity: targetQty,
            min_stock: existingSpare?.min_stock || 0,
            cost_price: unitCost || Number(existingSpare?.cost_price || 0),
            supplier_id: existingSpare?.supplier_id || null
          },
          { onConflict: 'spare_code' }
        )
        .select('id, spare_code, name, stock_quantity')
        .single()

      if (upsertError) throw upsertError

      const previousQty = Number(existingSpare?.stock_quantity || 0)
      const delta = targetQty - previousQty
      const { error: txError } = await db
        .from('stock_transactions')
        .insert({
          organization_id: organizationId,
          spare_id: upsertedSpare.id,
          type: 'adjustment',
          quantity: delta,
          reference: `IMPORT-${spareCode}`
        })
      if (txError) {
        console.warn('[inventory.import.confirm] transaction_insert_failed', {
          rowNumber,
          spareCode,
          message: txError.message
        })
      }

      appliedRows += 1
      affectedSpareCodes.add(String(upsertedSpare.spare_code || spareCode).trim())
      if (existingSpare) {
        updatedRows += 1
      } else {
        insertedRows += 1
      }
    } catch (err) {
      skippedRows += 1
      rowErrors.push({ row: rowNumber, reason: err instanceof Error ? err.message : 'Upsert failed' })
    }
  }

  return {
    appliedRows,
    skippedRows,
    insertedRows,
    updatedRows,
    affectedSpareCodes: [...affectedSpareCodes],
    errors: rowErrors
  }
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

export async function POST(request: NextRequest) {
  return withOrganizationContext(async (organizationId) => {
    try {
      const body = await request.json()
      const rows = Array.isArray(body?.rows) ? body.rows : []
      const fileName = String(body?.fileName || 'inventory-import.xlsx')
      const batchKey = String(body?.batchKey || crypto.randomUUID())
      const typedRows = rows as ConfirmRow[]

      if (rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'MISSING_ROWS',
              message: 'No rows provided for import apply'
            }
          },
          { status: 400 }
        )
      }

      // Process all rows regardless of individual ERROR status — fallback handles per-row skipping

      const { userId } = await getRequestContext()
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

      const applyResult = await applyImportRows(db, organizationId, userId, typedRows)

      return NextResponse.json(
        {
          success: true,
          data: {
            appliedRows: applyResult.appliedRows,
            skippedRows: applyResult.skippedRows,
            insertedRows: applyResult.insertedRows,
            updatedRows: applyResult.updatedRows,
            affectedSpareCodes: applyResult.affectedSpareCodes,
            errors: applyResult.errors
          }
        },
        { status: 200 }
      )
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFIRM_FAILED',
            message: error instanceof Error ? error.message : 'Failed to apply import'
          }
        },
        { status: 500 }
      )
    }
  })
}
