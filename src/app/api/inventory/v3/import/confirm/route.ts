import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { withOrganizationContext } from '@/utils/withOrganizationContext'
import { getRequestContext } from '@/lib/orgContext'

export const runtime = 'nodejs'

type ConfirmRow = {
  rowNumber?: number
  itemCode?: string
  itemName?: string
  systemCode?: string
  systemName?: string
  category?: string
  closingStock?: number
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

function normalizeSystemKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function parseNumber(value: unknown): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
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

async function applyImportFallback(
  db: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
  rows: ConfirmRow[]
): Promise<{ appliedRows: number; skippedRows: number; mode: 'fallback' }> {
  const legacyDb = db as any

  const [itemsResult, systemsResult, stockResult] = await Promise.all([
    legacyDb
      .from('inventory_items')
      .select('id, item_code, item_name, category, is_active')
      .eq('organization_id', organizationId)
      .neq('is_active', false),
    legacyDb
      .from('systems')
      .select('id, system_name, system_code')
      .eq('organization_id', organizationId),
    legacyDb
      .from('inventory_stock')
      .select('item_id, system_id, quantity')
      .eq('organization_id', organizationId)
  ])

  if (itemsResult.error) throw itemsResult.error
  if (systemsResult.error) throw systemsResult.error
  if (stockResult.error) throw stockResult.error

  const items = itemsResult.data || []
  const systems = systemsResult.data || []
  const stocks = stockResult.data || []

    type LegacyItem = { id: string; item_code: string; item_name: string; category: string; is_active: boolean }
    type LegacySystem = { id: string; system_name: string; system_code: string }
    type LegacyStock = { item_id: string; system_id: string; quantity: number | null }
    const typedItems = (items as LegacyItem[])
    const typedSystems = (systems as LegacySystem[])
    const typedStocks = (stocks as LegacyStock[])

    const itemCodeMap = new Map(typedItems.map((item) => [String(item.item_code || '').toUpperCase(), item]))
    const itemNameMap = new Map(typedItems.map((item) => [String(item.item_name || '').toUpperCase(), item]))

    const systemCodeMap = new Map(typedSystems.map((system) => [String(system.system_code || '').toUpperCase(), system]))
    const systemNameMap = new Map(typedSystems.map((system) => [String(system.system_name || '').toUpperCase(), system]))
    const systemNormalizedMap = new Map<string, LegacySystem>()
    typedSystems.forEach((system) => {
      const code = normalizeSystemKey(String(system.system_code || ''))
      const name = normalizeSystemKey(String(system.system_name || ''))
      if (code) systemNormalizedMap.set(code, system)
      if (name) systemNormalizedMap.set(name, system)
    })

    const stockMap = new Map(typedStocks.map((stock) => [`${stock.item_id}:${stock.system_id}`, stock]))

  let appliedRows = 0
  let skippedRows = 0

  for (const row of rows) {
    const rowStatus = String(row.importStatus || row.status || '').toUpperCase()
    if (rowStatus === 'ERROR') {
      skippedRows += 1
      continue
    }

    const itemCode = String(row.itemCode || '').trim().toUpperCase()
    const itemName = String(row.itemName || '').trim()
    const systemCode = String(row.systemCode || '').trim().toUpperCase()
    const systemName = String(row.systemName || '').trim()

    const item = itemCodeMap.get(itemCode) || itemNameMap.get(itemName.toUpperCase()) || null
    const normalizedSystemCode = normalizeSystemKey(systemCode)
    const normalizedSystemName = normalizeSystemKey(systemName)
    const system =
      systemCodeMap.get(systemCode) ||
      systemNameMap.get(systemCode) ||
      systemCodeMap.get(systemName.toUpperCase()) ||
      systemNameMap.get(systemName.toUpperCase()) ||
      (normalizedSystemCode ? systemNormalizedMap.get(normalizedSystemCode) : null) ||
      (normalizedSystemName ? systemNormalizedMap.get(normalizedSystemName) : null) ||
      null

    if (!item || !system) {
      skippedRows += 1
      continue
    }

    const targetQty = parseNumber(row.closingStock)
    const stockKey = `${item.id}:${system.id}`
    const existingStock = stockMap.get(stockKey)

    if (existingStock) {
      const { error: updateError } = await legacyDb
        .from('inventory_stock')
        .update({ quantity: targetQty })
        .eq('organization_id', organizationId)
        .eq('item_id', item.id)
        .eq('system_id', system.id)
      if (updateError) throw updateError
    } else {
      const { error: insertError } = await legacyDb
        .from('inventory_stock')
        .insert({
          organization_id: organizationId,
          item_id: item.id,
          system_id: system.id,
          quantity: targetQty
        })
      if (insertError) throw insertError
    }

    const { error: txError } = await legacyDb
      .from('inventory_transactions')
      .insert({
        organization_id: organizationId,
        item_id: item.id,
        system_id: system.id,
        transaction_type: 'ADJUSTMENT',
        quantity: targetQty,
        notes: 'Import fallback apply',
        created_by: userId
      })
    if (txError) {
      console.warn('[inventory.import.confirm] fallback_transaction_insert_failed', {
        organizationId,
        itemId: item.id,
        systemId: system.id,
        message: txError.message
      })
    }

    appliedRows += 1
  }

  return { appliedRows, skippedRows, mode: 'fallback' }
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

      if (typedRows.some((row) => row?.status === 'ERROR' || row?.importStatus === 'ERROR' || (row?.errors?.length || 0) > 0)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'BLOCKING_ERRORS',
              message: 'Please resolve row-level errors before confirming import'
            }
          },
          { status: 400 }
        )
      }

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

      const legacyDb = db as any

      const { data, error } = await legacyDb.rpc('apply_inventory_import_v2', {
        p_organization_id: organizationId,
        p_uploaded_by: userId,
        p_file_name: fileName,
        p_batch_key: batchKey,
        p_rows: rows
      })

      let applyResult: unknown = data || {}
      if (error) {
        const errorMsg = String(error.message || '')
        const canFallback = /no unique or exclusion constraint matching the ON CONFLICT specification/i.test(errorMsg)
        if (!canFallback) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'APPLY_FAILED',
                message: error.message
              }
            },
            { status: 500 }
          )
        }

        console.warn('[inventory.import.confirm] rpc_apply_failed_fallback_triggered', {
          organizationId,
          message: errorMsg
        })

        applyResult = await applyImportFallback(db, organizationId, userId, typedRows)
      }

      const inventoryStockSyncResult = await syncInventoryStockQuantities(db, organizationId, typedRows)
      let stockSyncResult: { syncedCount: number; mode: 'inventory' | 'rows' } = { syncedCount: 0, mode: 'inventory' }
      try {
        const inventorySync = await syncSpareStockFromInventory(db, organizationId)
        stockSyncResult = { ...inventorySync, mode: 'inventory' }
      } catch (syncError) {
        console.warn('[inventory.import.confirm] inventory_spare_sync_failed_using_row_fallback', {
          organizationId,
          message: syncError instanceof Error ? syncError.message : 'Unknown sync error'
        })
        const rowSync = await syncSpareStockFromRows(db, organizationId, typedRows)
        stockSyncResult = { ...rowSync, mode: 'rows' }
      }

      const { data: availabilityRows } = await legacyDb
        .from('system_inventory')
        .select('system_id, available_count, limiting_item, systems(system_name)')
        .eq('organization_id', organizationId)

      const mappedAvailability = ((availabilityRows || []) as unknown as AvailabilityRow[]).map((row) => ({
        systemId: row.system_id,
        systemName: String(normalizeOne(row.systems)?.system_name || ''),
        availableCount: row.available_count,
        limitingItem: row.limiting_item
      }))

      return NextResponse.json(
        {
          success: true,
          data: {
            ...(applyResult as object),
            inventoryStockSync: inventoryStockSyncResult,
            spareStockSync: stockSyncResult,
            systemAvailability: mappedAvailability
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
