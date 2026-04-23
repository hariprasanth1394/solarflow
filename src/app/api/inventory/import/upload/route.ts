/**
 * POST /api/inventory/import/upload
 * Upload and validate Excel file
 */

import { NextRequest, NextResponse } from 'next/server'
import { uploadAndValidateExcel } from '@/services/inventoryImportService'

const ALLOWED_FILE_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_MISSING',
            message: 'No file provided'
          }
        },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_INVALID_TYPE',
            message: 'Only Excel files (.xlsx) are accepted',
            details: {
              receivedType: file.type,
              acceptedTypes: [ALLOWED_FILE_TYPE]
            }
          }
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_SIZE_EXCEEDED',
            message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            details: {
              fileSize: file.size,
              maxSize: MAX_FILE_SIZE
            }
          }
        },
        { status: 400 }
      )
    }

    // Convert File to Blob for processing
    const blob = new Blob([await file.arrayBuffer()], { type: file.type })

    const result = await uploadAndValidateExcel(blob, file.name)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: result.error
          }
        },
        { status: 400 }
      )
    }

    // Return formatted response matching integration spec
    return NextResponse.json(
      {
        success: true,
        data: {
          batchId: '',
          fileHash: result.data?.fileHash || '',
          totalRows: result.data?.totalRows || 0,
          headers: [
            'Item Code',
            'System Code',
            'Issued Qty',
            'Closing Stock'
          ],
          preview: result.data?.rows || [],
          uploadedAt: new Date().toISOString()
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Failed to process file upload',
          details:
            error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}
