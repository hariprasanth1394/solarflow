/**
 * GET /api/inventory/import/logs/:batchId
 * Retrieve detailed information about a specific import batch
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { withOrganizationContext } from '@/utils/withOrganizationContext'

interface RouteParams {
  params: Promise<{
    batchId: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withOrganizationContext(async (organizationId) => {
    try {
      const db = supabase as any
      const { batchId } = await params

      if (!batchId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'MISSING_BATCH_ID',
              message: 'batchId is required'
            }
          },
          { status: 400 }
        )
      }

      // Fetch batch details
      const { data: batch, error: batchError } = await db
        .from('import_batches')
        .select('*')
        .eq('id', batchId)
        .eq('organization_id', organizationId)
        .single()

      if (batchError || !batch) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'BATCH_NOT_FOUND',
              message: 'Import batch not found'
            }
          },
          { status: 404 }
        )
      }

      // Fetch all import records for this batch
      const { data: records, error: recordsError } = await db
        .from('import_records')
        .select(
          `
          id,
          row_number,
          record_status,
          item_code,
          system_code,
          issued_qty,
          closing_stock,
          validation_errors,
          validation_warnings
        `
        )
        .eq('batch_id', batchId)
        .order('row_number', { ascending: true })

      if (recordsError) throw recordsError

      // Get uploader email
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', batch.uploaded_by)
        .single()

      // Format batch detail
      const processingTime = batch.completed_at
        ? Math.floor(
            (new Date(batch.completed_at).getTime() -
              new Date(batch.created_at).getTime()) /
              1000
          )
        : null

      const batchDetail = {
        batchId: batch.id,
        filename: batch.file_name,
        status: batch.batch_status,
        uploadedBy: userData?.email || 'Unknown',
        uploadedAt: batch.created_at,
        completedAt: batch.completed_at,
        processingTime: processingTime || 0
      }

      // Format records
      const formattedRecords = (records || []).map((record: any) => ({
        recordId: record.id,
        rowNumber: record.row_number,
        status: record.record_status,
        itemCode: record.item_code,
        systemCode: record.system_code,
        issuedQty: record.issued_qty,
        closingStock: record.closing_stock,
        errors: record.validation_errors || [],
        warnings: record.validation_warnings || []
      }))

      // Calculate summary
      const successCount = formattedRecords.filter(
        (r: any) => r.status === 'completed'
      ).length
      const errorCount = formattedRecords.filter(
        (r: any) => r.status === 'error'
      ).length
      const warningCount = formattedRecords.reduce(
        (sum: number, r: any) => sum + (r.warnings?.length || 0),
        0
      )

      return NextResponse.json(
        {
          success: true,
          data: {
            batch: batchDetail,
            records: formattedRecords,
            summary: {
              totalRecords: formattedRecords.length,
              successCount,
              errorCount,
              warningCount
            }
          }
        },
        { status: 200 }
      )
    } catch (error) {
      console.error('Batch detail fetch error:', error)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: 'Failed to retrieve batch details',
            details:
              error instanceof Error ? error.message : 'Unknown error'
          }
        },
        { status: 500 }
      )
    }
  })
}
