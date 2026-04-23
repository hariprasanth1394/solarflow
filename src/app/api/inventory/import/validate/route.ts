/**
 * POST /api/inventory/import/validate
 * Validate rows against database
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateRowsAgainstDatabase, createImportBatch } from '@/services/inventoryImportService'
import { withOrganizationContext } from '@/utils/withOrganizationContext'
import { getRequestContext } from '@/lib/orgContext'

export async function POST(request: NextRequest) {
  return withOrganizationContext(async (organizationId) => {
    try {
      const body = await request.json()
      const { batchId } = body
      const rows = body?.rows || body?.preview

      if (!rows || !Array.isArray(rows)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ROWS',
              message: 'rows must be an array'
            }
          },
          { status: 400 }
        )
      }

      if (rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'EMPTY_ROWS',
              message: 'No rows to validate'
            }
          },
          { status: 400 }
        )
      }

      // Get current user from request context
      const { userId } = await getRequestContext()

      if (!userId) {
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

      // Validate against database
      const validationResult = await validateRowsAgainstDatabase(rows)

      if (!validationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: validationResult.error
            }
          },
          { status: 422 }
        )
      }

      // Create import batch if not exists
      const actualBatchId = batchId || crypto.randomUUID()
      let persistedBatchId: string | null = null
      let persistenceDisabled = false

      const batchResult = await createImportBatch(
        'import_file.xlsx',
        crypto.randomUUID(),
        rows.length,
        validationResult.data || [],
        userId
      )

      if (!batchResult.success) {
        const batchError = String(batchResult.error || '')
        const missingImportTables =
          batchError.toLowerCase().includes('import_batches') &&
          batchError.toLowerCase().includes('schema cache')

        if (!missingImportTables) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'BATCH_CREATION_FAILED',
                message: batchResult.error
              }
            },
            { status: 400 }
          )
        }

        persistenceDisabled = true
      } else {
        persistedBatchId = batchResult.data?.batchId || null
      }

      // Calculate summary statistics
      const validatedRows = validationResult.data || []
      const validRows = validatedRows.filter((r: any) => (r.errors?.length || 0) === 0).length
      const errorCount = validatedRows.filter((r: any) => (r.errors?.length || 0) > 0).length
      const warningCount = validatedRows.reduce(
        (sum: number, r: any) => sum + (r.warnings?.length || 0),
        0
      )

      const itemContextMap = validationResult.context?.itemCodeMap || new Map<string, any>()

      let newRows = 0
      let updatedRows = 0
      let unchangedRows = 0

      const previewRows = validatedRows.map((row: any) => {
        const dbItem = itemContextMap.get(String(row.itemCode || '').toUpperCase())
        const dbCurrentStock = Number(dbItem?.currentStock ?? row.currentStock ?? 0)
        const importedClosingStock = Number(row.closingStock ?? row.currentStock ?? 0)
        const difference = importedClosingStock - dbCurrentStock

        let importStatus: 'NEW' | 'UPDATED' | 'UNCHANGED' | 'ERROR' = 'UNCHANGED'

        if ((row.errors?.length || 0) > 0) {
          importStatus = 'ERROR'
        } else if (!dbItem) {
          importStatus = 'NEW'
          newRows++
        } else if (Math.abs(difference) > 0.01) {
          importStatus = 'UPDATED'
          updatedRows++
        } else {
          importStatus = 'UNCHANGED'
          unchangedRows++
        }

        return {
          rowNumber: row.rowNumber,
          itemCode: row.itemCode,
          itemName: row.itemName,
          systemCode: row.systemCode,
          systemName: row.systemName,
          currentStock: row.currentStock,
          issuedQty: row.issuedQty,
          closingStock: row.closingStock,
          unitCost: row.unitCost,
          totalValue: row.totalValue,
          dbCurrentStock,
          importedStock: importedClosingStock,
          difference,
          importStatus,
          errors: row.errors || [],
          warnings: row.warnings || [],
          itemId: dbItem?.id || null,
          systemId: row.systemId || null
        }
      })

      // Detect duplicates
      const itemSystemPairs = new Set<string>()
      const duplicates = new Set<number>()
      validatedRows.forEach((row: any) => {
        const key = `${row.itemCode}:${row.systemCode}`
        if (itemSystemPairs.has(key)) {
          duplicates.add(row.rowNumber)
        }
        itemSystemPairs.add(key)
      })

      return NextResponse.json(
        {
          success: true,
          data: {
            batchId: persistedBatchId || actualBatchId,
            persistenceDisabled,
            validationReport: {
              totalRows: rows.length,
              validRows,
              errorCount,
              warningCount,
              duplicateCount: duplicates.size,
              newRows,
              updatedRows,
              unchangedRows,
              hasBlockingErrors: errorCount > 0
            },
            rows: previewRows
          }
        },
        { status: 200 }
      )
    } catch (error) {
      console.error('Validation error:', error)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Failed to validate rows',
            details:
              error instanceof Error ? error.message : 'Unknown error'
          }
        },
        { status: 500 }
      )
    }
  })
}
