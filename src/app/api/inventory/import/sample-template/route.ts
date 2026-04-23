import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export const runtime = 'nodejs'

const HEADERS = [
  'Item Code',
  'Item Name',
  'System Code',
  'System Name',
  'Current Stock',
  'Issued Qty',
  'Closing Stock',
  'Unit Cost',
  'Total Value'
]

export async function GET() {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value
    const accessToken = token ? decodeURIComponent(token) : undefined

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFIG_ERROR',
            message: 'Supabase configuration is missing'
          }
        },
        { status: 500 }
      )
    }

    if (!accessToken) {
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

    const requestClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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

    const { data: userData, error: authError } = await requestClient.auth.getUser(accessToken)

    if (authError || !userData.user) {
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

    const db = requestClient as any

      const [linkedResult, sparesResult, systemsResult] = await Promise.all([
        db
          .from('system_components')
          .select('spare_id, system_id')
          .limit(300),
        db
          .from('spares')
          .select('id, name, stock_quantity, cost_price')
          .order('name', { ascending: true })
          .limit(300),
        db
          .from('systems')
          .select('id, system_name')
          .order('system_name', { ascending: true })
          .limit(300)
      ])

      if (sparesResult.error) {
        throw sparesResult.error
      }
      if (systemsResult.error) {
        throw systemsResult.error
      }

      const spares = (sparesResult.data || []) as any[]
      const systems = (systemsResult.data || []) as any[]
      const linkedRows = ((linkedResult.error ? [] : linkedResult.data) || []) as any[]

      const spareMap = new Map(spares.map((spare) => [spare.id, spare]))
      const systemMap = new Map(systems.map((system) => [system.id, system]))

      const uniquePairRows = Array.from(
        (linkedRows || []).reduce((acc: Map<string, any>, row: any) => {
          const key = `${row.spare_id}:${row.system_id}`
          if (!acc.has(key)) {
            acc.set(key, row)
          }
          return acc
        }, new Map<string, any>()).values()
      )

      let templateRows = uniquePairRows.slice(0, 100).map((row: any) => {
        const spare = spareMap.get(row.spare_id) || {}
        const system = systemMap.get(row.system_id) || {}

        const spareName = String(spare?.name || '').trim()
        const systemName = String(system?.system_name || '').trim()
        const currentStock = Number(spare?.stock_quantity || 0)
        const unitCost = Number(spare?.cost_price || 0)

        return {
          'Item Code': spareName.toUpperCase(),
          'Item Name': spareName,
          'System Code': systemName.toUpperCase(),
          'System Name': systemName,
          'Current Stock': currentStock,
          'Issued Qty': 0,
          'Closing Stock': currentStock,
          'Unit Cost': unitCost,
          'Total Value': currentStock * unitCost
        }
      })

      if (templateRows.length === 0 && spares.length > 0 && systems.length > 0) {
        const fallbackSize = Math.min(spares.length, systems.length, 100)
        templateRows = Array.from({ length: fallbackSize }).map((_, index) => {
          const spare = spares[index]
          const system = systems[index]
          const spareName = String(spare?.name || '').trim()
          const systemName = String(system?.system_name || '').trim()
          const currentStock = Number(spare?.stock_quantity || 0)
          const unitCost = Number(spare?.cost_price || 0)

          return {
            'Item Code': spareName.toUpperCase(),
            'Item Name': spareName,
            'System Code': systemName.toUpperCase(),
            'System Name': systemName,
            'Current Stock': currentStock,
            'Issued Qty': 0,
            'Closing Stock': currentStock,
            'Unit Cost': unitCost,
            'Total Value': currentStock * unitCost
          }
        })
      }

      if (templateRows.length === 0) {
        templateRows = [
          {
            'Item Code': '',
            'Item Name': '',
            'System Code': '',
            'System Name': '',
            'Current Stock': 0,
            'Issued Qty': 0,
            'Closing Stock': 0,
            'Unit Cost': 0,
            'Total Value': 0
          }
        ]
      }

      const worksheet = XLSX.utils.json_to_sheet(templateRows, { header: HEADERS })
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock_Import')

      const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })

      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="inventory-import-real-sample.xlsx"',
          'Cache-Control': 'no-store'
        }
      })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
          ? String((error as any).message)
          : 'Failed to generate template'
    const unauthorized = message.toLowerCase().includes('not authenticated')

    return NextResponse.json(
      {
        success: false,
        error: {
          code: unauthorized ? 'UNAUTHORIZED' : 'TEMPLATE_GENERATION_FAILED',
          message: unauthorized ? 'User not authenticated' : message
        }
      },
      { status: unauthorized ? 401 : 500 }
    )
  }
}
