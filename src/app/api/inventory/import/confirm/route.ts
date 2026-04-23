import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { withOrganizationContext } from '@/utils/withOrganizationContext'
import { getRequestContext } from '@/lib/orgContext'

type ImportPayloadRow = {
  rowNumber: number
  itemCode: string
  itemName: string
  systemCode: string
  currentStock: number
  closingStock: number | null
  unitCost: number
  errors?: Array<{ message?: string; column?: string }>
  importStatus?: 'NEW' | 'UPDATED' | 'UNCHANGED' | 'ERROR'
}

export async function POST(request: NextRequest) {
  return withOrganizationContext(async (organizationId) => {
    try {
      const db = supabase as any
      const body = await request.json()
      const rows = Array.isArray(body?.rows) ? (body.rows as ImportPayloadRow[]) : []

      const { userId } = await getRequestContext()

      if (!rows.length) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'MISSING_ROWS',
              message: 'rows are required to apply import'
            }
          },
          { status: 400 }
        )
      }

      const { data: rpcResult, error: rpcError } = await db.rpc('apply_inventory_import_rows', {
        p_organization_id: organizationId,
        p_rows: rows,
        p_performed_by: userId
      })

      if (!rpcError && rpcResult) {
        return NextResponse.json(
          {
            success: true,
            data: rpcResult
          },
          { status: 200 }
        )
      }

      const blockingErrors = rows
        .filter((row) => (row.importStatus === 'ERROR') || ((row.errors?.length || 0) > 0))
        .map((row) => ({
          rowNumber: row.rowNumber,
          errors: row.errors || []
        }))

      if (blockingErrors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'BLOCKING_ERRORS',
              message: 'Fix row-level validation errors before applying import',
              details: {
                errorRows: blockingErrors.length,
                rows: blockingErrors
              }
            }
          },
          { status: 400 }
        )
      }

      const { data: existingSpares, error: sparesError } = await db
        .from('spares')
        .select('id, name, stock_quantity, cost_price')
        .eq('organization_id', organizationId)

      if (sparesError) throw sparesError

      const spareByCodeOrName = new Map<string, any>()
      ;((existingSpares || []) as any[]).forEach((spare) => {
        const nameKey = String(spare?.name || '').trim().toUpperCase()
        if (nameKey) spareByCodeOrName.set(nameKey, spare)
      })

      const toInsert: Array<{ name: string; stock_quantity: number; cost_price: number }> = []
      const toUpdate: Array<{ id: string; stock_quantity: number; cost_price: number; delta: number; name: string }> = []
      const unchanged: Array<{ id: string; name: string }> = []

      rows.forEach((row) => {
        const keyFromCode = String(row.itemCode || '').trim().toUpperCase()
        const keyFromName = String(row.itemName || '').trim().toUpperCase()
        const existing = spareByCodeOrName.get(keyFromCode) || spareByCodeOrName.get(keyFromName)

        const importedClosingStock = Number(row.closingStock ?? row.currentStock ?? 0)
        const importedUnitCost = Number(row.unitCost || 0)

        if (!existing) {
          toInsert.push({
            name: String(row.itemName || row.itemCode || '').trim(),
            stock_quantity: importedClosingStock,
            cost_price: importedUnitCost
          })
          return
        }

        const currentDbStock = Number(existing.stock_quantity || 0)
        const delta = importedClosingStock - currentDbStock

        if (Math.abs(delta) <= 0.01) {
          unchanged.push({ id: existing.id, name: existing.name })
          return
        }

        toUpdate.push({
          id: existing.id,
          name: existing.name,
          stock_quantity: importedClosingStock,
          cost_price: importedUnitCost || Number(existing.cost_price || 0),
          delta
        })
      })

      let insertedSpares: any[] = []
      if (toInsert.length > 0) {
        const insertPayload = toInsert.map((row) => ({
          organization_id: organizationId,
          name: row.name,
          stock_quantity: row.stock_quantity,
          min_stock: 0,
          cost_price: row.cost_price
        }))

        const { data: created, error: insertError } = await db
          .from('spares')
          .insert(insertPayload)
          .select('id, name, stock_quantity, cost_price')

        if (insertError) throw insertError
        insertedSpares = created || []
      }

      if (toUpdate.length > 0) {
        await Promise.all(
          toUpdate.map(async (row) => {
            const { error } = await db
              .from('spares')
              .update({ stock_quantity: row.stock_quantity, cost_price: row.cost_price })
              .eq('id', row.id)
              .eq('organization_id', organizationId)

            if (error) throw error
          })
        )
      }

      const transactionRows = [
        ...toUpdate.map((row) => ({
          organization_id: organizationId,
          spare_id: row.id,
          type: 'adjustment',
          quantity: row.delta,
          reference: `IMPORT-UPDATE-${new Date().toISOString()}`
        })),
        ...insertedSpares.map((row: any) => ({
          organization_id: organizationId,
          spare_id: row.id,
          type: 'adjustment',
          quantity: Number(row.stock_quantity || 0),
          reference: `IMPORT-NEW-${new Date().toISOString()}`
        }))
      ]

      if (transactionRows.length > 0) {
        const { error: transactionError } = await db
          .from('stock_transactions')
          .insert(transactionRows)

        if (transactionError) throw transactionError
      }

      const { data: systems, error: systemsError } = await db
        .from('systems')
        .select('id, system_name')
        .eq('organization_id', organizationId)

      if (systemsError) throw systemsError

      const { data: boms, error: bomsError } = await db
        .from('system_components')
        .select(
          `
          system_id,
          quantity_required,
          spares (
            id,
            name,
            stock_quantity
          )
        `
        )
        .eq('organization_id', organizationId)

      if (bomsError) throw bomsError

      const bomMap = new Map<string, any[]>()
      ;((boms || []) as any[]).forEach((row) => {
        const list = bomMap.get(row.system_id) || []
        list.push(row)
        bomMap.set(row.system_id, list)
      })

      const availability = ((systems || []) as any[]).map((system) => {
        const systemBom = bomMap.get(system.id) || []
        if (systemBom.length === 0) {
          return {
            systemId: system.id,
            systemName: system.system_name,
            availableCount: 0,
            limitingItem: 'N/A'
          }
        }

        let availableCount = Number.MAX_SAFE_INTEGER
        let limitingItem = 'N/A'

        systemBom.forEach((component: any) => {
          const stock = Number(component?.spares?.stock_quantity || 0)
          const required = Number(component?.quantity_required || 1)
          const buildable = Math.floor(stock / Math.max(required, 1))
          if (buildable < availableCount) {
            availableCount = buildable
            limitingItem = String(component?.spares?.name || 'N/A')
          }
        })

        return {
          systemId: system.id,
          systemName: system.system_name,
          availableCount: availableCount === Number.MAX_SAFE_INTEGER ? 0 : availableCount,
          limitingItem
        }
      })

      return NextResponse.json(
        {
          success: true,
          data: {
            status: 'success',
            summary: {
              totalRows: rows.length,
              updatedRows: toUpdate.length,
              newRows: insertedSpares.length,
              unchangedRows: unchanged.length,
              errorRows: 0
            },
            stockMovement: {
              itemsAffected: toUpdate.length + insertedSpares.length,
              totalQtyIssued: toUpdate.reduce((sum, row) => sum + Math.max(0, -row.delta), 0),
              totalValueIssued: toUpdate.reduce((sum, row) => sum + (Math.max(0, -row.delta) * row.cost_price), 0)
            },
            systemAvailability: availability,
            reconciliation: {
              status: 'ok',
              message: 'Stock reconciliation completed at item level'
            }
          }
        },
        { status: 200 }
      )
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PROCESS_ERROR',
            message: error instanceof Error ? error.message : 'Failed to process import',
            details: 'If this persists, verify migration 202604140003_import_hardening_perf.sql is applied.'
          }
        },
        { status: 500 }
      )
    }
  })
}
