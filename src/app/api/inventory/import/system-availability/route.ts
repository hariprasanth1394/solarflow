/**
 * POST /api/inventory/import/system-availability
 * Calculate system availability impact before/after import
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { withOrganizationContext } from '@/utils/withOrganizationContext'

export async function POST(request: NextRequest) {
  return withOrganizationContext(async (organizationId) => {
    try {
      const db = supabase as any
      const body = await request.json()
      const { batchId, includeImpactAnalysis = true } = body
      const requestRows = Array.isArray(body?.rows) ? body.rows : []

      if (!batchId && requestRows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'MISSING_INPUT',
              message: 'batchId or rows is required'
            }
          },
          { status: 400 }
        )
      }

      let records: any[] = []

      if (batchId) {
        const { data: batchRecords, error: recordsError } = await db
          .from('import_records')
          .select('*')
          .eq('batch_id', batchId)
          .eq('organization_id', organizationId)

        if (recordsError) {
          const msg = String(recordsError?.message || '')
          const missingImportRecordsTable =
            msg.toLowerCase().includes('import_records') &&
            msg.toLowerCase().includes('schema cache')

          if (!missingImportRecordsTable || requestRows.length === 0) {
            throw recordsError
          }
        } else {
          records = batchRecords || []
        }
      }

      if (records.length === 0 && requestRows.length > 0) {
        const { data: spares, error: sparesError } = await db
          .from('spares')
          .select('id, name')
          .eq('organization_id', organizationId)

        if (sparesError) throw sparesError

        const spareMap = new Map(
          ((spares as any[]) || []).map((spare: any) => [
            String(spare?.name || '').toUpperCase(),
            spare.id
          ])
        )

        records = requestRows.map((row: any) => {
          const itemCode = String(row?.itemCode || '').trim().toUpperCase()
          const itemName = String(row?.itemName || '').trim().toUpperCase()
          const resolvedSpareId = spareMap.get(itemCode) || spareMap.get(itemName) || null

          return {
            spare_id: resolvedSpareId,
            item_code: itemCode || itemName,
            issued_qty: Number(row?.issuedQty || 0),
            organization_id: organizationId
          }
        })
      }

      if (!records || records.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'BATCH_NOT_FOUND',
              message: 'No records found for this batch'
            }
          },
          { status: 404 }
        )
      }

      // Fetch systems and their BOMs
      const { data: systems, error: systemsError } = await supabase
        .from('systems')
        .select(
          `
          id,
          system_name
        `
        )
        .eq('organization_id', organizationId)

      if (systemsError) throw systemsError

      // Fetch system BOMs (requirements)
      const { data: boms, error: bomsError } = await supabase
        .from('system_components')
        .select(
          `
          system_id,
          spare_id,
          quantity_required,
          spares (
            id,
            name,
            stock_quantity,
            min_stock
          )
        `
        )
        .in(
          'system_id',
          (systems || []).map((s: any) => s.id)
        )

      if (bomsError) throw bomsError

      // Build maps for quick lookup
      const systemMap = new Map((systems || []).map((s: any) => [s.id, s]))
      const bomMap = new Map<string, any[]>()
      
      ;(boms || []).forEach((bom: any) => {
        if (!bomMap.has(bom.system_id)) {
          bomMap.set(bom.system_id, [])
        }
        bomMap.get(bom.system_id)!.push(bom)
      })

      // Build stock changes map from import records
      const stockChanges = new Map<string, number>()
      records.forEach((record: any) => {
        const key = record.spare_id
        const change = -(record.issued_qty || 0) // Negative because it's issued
        if (key) {
          stockChanges.set(key, (stockChanges.get(key) || 0) + change)
        }

        const itemKey = String(record?.item_code || '').trim().toUpperCase()
        if (itemKey) {
          const fallbackKey = `__NAME__:${itemKey}`
          stockChanges.set(fallbackKey, (stockChanges.get(fallbackKey) || 0) + change)
        }
      })

      // Calculate availability for each system (before and after)
      const beforeAvailability: any[] = []
      const afterAvailability: any[] = []
      const systemsAffected = new Set<string>()
      let systemsImproved = 0
      let systemsWorsened = 0
      const newShortages: string[] = []

      for (const system of (systems || []) as any[]) {
        const systemBom = bomMap.get(system.id) || []
        
        if (systemBom.length === 0) {
          continue // Skip systems with no BOM
        }

        // Calculate BEFORE availability
        let minBefore = Infinity
        let limitingFactorBefore = ''
        const missingComponentsBefore: any[] = []

        for (const bom of systemBom) {
          const spare = bom.spares
          const required = bom.quantity_required
          const available = spare?.stock_quantity || 0
          const canBuild = Math.floor(available / required)

          minBefore = Math.min(minBefore, canBuild)

          if (canBuild < minBefore) {
            limitingFactorBefore = spare?.name || ''
          }

          if (available < required) {
            missingComponentsBefore.push({
              itemId: spare?.id,
              itemCode: spare?.item_code,
              itemName: spare?.name,
              required,
              available,
              shortage: required - available
            })
          }
        }

        const statusBefore =
          minBefore > 5 ? 'available' : minBefore > 0 ? 'limited' : 'unavailable'

        beforeAvailability.push({
          systemId: system.id,
          systemName: system.system_name,
          canBuild: minBefore === Infinity ? 0 : minBefore,
          status: statusBefore,
          limitingFactor: limitingFactorBefore,
          missingComponents: missingComponentsBefore
        })

        // Calculate AFTER availability (with import changes applied)
        let minAfter = Infinity
        let limitingFactorAfter = ''
        const missingComponentsAfter: any[] = []
        let changed = false

        for (const bom of systemBom) {
          const spare = bom.spares
          const required = bom.quantity_required
          const currentAvailable = spare?.stock_quantity || 0
          const nameKey = `__NAME__:${String(spare?.name || '').trim().toUpperCase()}`
          const change = (stockChanges.get(spare?.id) || 0) + (stockChanges.get(nameKey) || 0)
          const afterAvailable = currentAvailable + change // change is negative for issued
          const canBuild = Math.floor(afterAvailable / required)

          if (afterAvailable !== currentAvailable) {
            changed = true
          }

          minAfter = Math.min(minAfter, canBuild)

          if (canBuild < minAfter) {
            limitingFactorAfter = spare?.name || ''
          }

          if (afterAvailable < required) {
            missingComponentsAfter.push({
              itemId: spare?.id,
              itemCode: spare?.item_code,
              itemName: spare?.name,
              required,
              available: afterAvailable,
              shortage: required - afterAvailable
            })
          }
        }

        const statusAfter =
          minAfter > 5 ? 'available' : minAfter > 0 ? 'limited' : 'unavailable'

        if (changed) {
          systemsAffected.add(system.id)
        }

        // Track improvements/degradation
        const canBuildBefore = minBefore === Infinity ? 0 : minBefore
        const canBuildAfter = minAfter === Infinity ? 0 : minAfter

        if (canBuildAfter > canBuildBefore) {
          systemsImproved++
        } else if (canBuildAfter < canBuildBefore) {
          systemsWorsened++
        }

        // Track new shortages
        if (
          missingComponentsBefore.length === 0 &&
          missingComponentsAfter.length > 0
        ) {
          newShortages.push(system.system_name)
        }

        afterAvailability.push({
          systemId: system.id,
          systemName: system.system_name,
          canBuild: canBuildAfter,
          status: statusAfter,
          limitingFactor: limitingFactorAfter,
          missingComponents: missingComponentsAfter
        })
      }

      // Generate impact summary
      let impactSummary = ''
      if (systemsWorsened > 0) {
        impactSummary = `Import will reduce system availability for ${systemsWorsened} system(s). `
        if (newShortages.length > 0) {
          impactSummary += `New shortages detected for: ${newShortages.join(', ')}. `
        }
        impactSummary += 'Review impact before confirming.'
      } else if (systemsImproved > 0) {
        impactSummary = `Import will improve system availability for ${systemsImproved} system(s).`
      } else {
        impactSummary = 'Import will not significantly affect system availability.'
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            systemsAvailability: afterAvailability.map((row: any) => ({
              systemId: row.systemId,
              systemName: row.systemName,
              canBuild: row.canBuild,
              status: row.status,
              shortageDetected: (row.missingComponents || []).length > 0,
              missingComponents: row.missingComponents || []
            })),
            before: beforeAvailability,
            after: afterAvailability,
            impact: {
              systemsAffected: systemsAffected.size,
              systemsImproved,
              systemsWorsened,
              newShortages: newShortages.length,
              summary: impactSummary
            }
          }
        },
        { status: 200 }
      )
    } catch (error) {
      console.error('System availability calculation error:', error)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CALCULATION_ERROR',
            message: 'Failed to calculate system availability',
            details:
              error instanceof Error ? error.message : 'Unknown error'
          }
        },
        { status: 500 }
      )
    }
  })
}
