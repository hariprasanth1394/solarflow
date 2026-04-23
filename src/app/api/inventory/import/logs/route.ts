/**
 * GET /api/inventory/import/logs
 * Retrieve import batch history with pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { withOrganizationContext } from '@/utils/withOrganizationContext'

export async function GET(request: NextRequest) {
  return withOrganizationContext(async (organizationId) => {
    try {
      const db = supabase as any
      const searchParams = request.nextUrl.searchParams
      const status = searchParams.get('status') || 'all'
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
      const offset = parseInt(searchParams.get('offset') || '0')

      // Build query
      let query = db
        .from('import_batches')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      // Add status filter if not 'all'
      if (status !== 'all') {
        query = query.eq('batch_status', status)
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1)

      const { data: batches, count, error } = await query

      if (error) throw error

      // Get user info for uploader names
      const batchList = (batches as any[]) || []
      const uploaderIds = batchList.reduce((acc: string[], batch: any) => {
        const id = String(batch?.uploaded_by || '')
        if (id && !acc.includes(id)) {
          acc.push(id)
        }
        return acc
      }, [] as string[])

      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', uploaderIds as readonly string[])

      const userMap = new Map(users?.map((u: any) => [u.id, u.email]) || [])

      // Format batch data
      const formattedBatches = (batches || []).map((batch: any) => {
        const processingTime = batch.completed_at
          ? Math.floor(
              (new Date(batch.completed_at).getTime() -
                new Date(batch.created_at).getTime()) /
                1000
            )
          : null

        const successCount = batch.success_count || 0
        const totalRows = batch.total_rows || 0
        const errorCount = batch.batch_metadata?.errorRows || 0
        const warningCount = batch.batch_metadata?.warningRows || 0

        return {
          batchId: batch.id,
          filename: batch.file_name,
          status: batch.batch_status,
          uploadedBy: userMap.get(batch.uploaded_by) || 'Unknown',
          uploadedAt: batch.created_at,
          completedAt: batch.completed_at,
          processingTime: processingTime || 0,
          totalRows,
          successCount,
          errorCount,
          warningCount,
          successRate: totalRows > 0 ? Math.round((successCount / totalRows) * 100) : 0
        }
      })

      return NextResponse.json(
        {
          success: true,
          data: {
            total: count || 0,
            batches: formattedBatches
          }
        },
        { status: 200 }
      )
    } catch (error) {
      console.error('Import logs fetch error:', error)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: 'Failed to retrieve import logs',
            details:
              error instanceof Error ? error.message : 'Unknown error'
          }
        },
        { status: 500 }
      )
    }
  })
}
