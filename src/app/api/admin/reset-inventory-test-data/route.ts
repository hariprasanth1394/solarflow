import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { getRequestContext } from '@/lib/orgContext'

export const runtime = 'nodejs'

const SPARE_SEED = [
  { name: 'Mono PERC Panel 540W', category: 'Panel', unit: 'Nos', stock_quantity: 290, min_stock: 60, cost_price: 9200 },
  { name: 'On-Grid Inverter 5KW', category: 'Inverter', unit: 'Nos', stock_quantity: 31, min_stock: 8, cost_price: 38500 },
  { name: 'On-Grid Inverter 10KW', category: 'Inverter', unit: 'Nos', stock_quantity: 12, min_stock: 4, cost_price: 72000 },
  { name: 'Lithium Battery 5kWh', category: 'Battery', unit: 'Nos', stock_quantity: 18, min_stock: 6, cost_price: 98000 },
  { name: 'MC4 Connector Pair', category: 'Connector', unit: 'Pair', stock_quantity: 890, min_stock: 200, cost_price: 190 },
  { name: 'DC Cable 6 sqmm', category: 'Cable', unit: 'Meter', stock_quantity: 5000, min_stock: 1200, cost_price: 85 },
  { name: 'AC Cable 10 sqmm', category: 'Cable', unit: 'Meter', stock_quantity: 2200, min_stock: 700, cost_price: 160 },
  { name: 'Galvanized Mounting Rail', category: 'Structure', unit: 'Meter', stock_quantity: 788, min_stock: 260, cost_price: 480 },
  { name: 'Mid Clamp', category: 'Structure', unit: 'Nos', stock_quantity: 1400, min_stock: 400, cost_price: 45 },
  { name: 'End Clamp', category: 'Structure', unit: 'Nos', stock_quantity: 1300, min_stock: 380, cost_price: 48 },
  { name: 'Earthing Kit', category: 'Safety', unit: 'Set', stock_quantity: 95, min_stock: 30, cost_price: 650 },
  { name: 'SPD Type-II', category: 'Protection', unit: 'Nos', stock_quantity: 42, min_stock: 18, cost_price: 2100 }
]

const SYSTEM_SEED = [
  { system_name: '5KW Solar Kit', capacity_kw: 5, description: 'Residential 5kW rooftop kit' },
  { system_name: '10KW Solar Kit', capacity_kw: 10, description: 'Commercial 10kW rooftop kit' },
  { system_name: '15KW Industrial Kit', capacity_kw: 15, description: 'Industrial starter kit with 15kW output' }
]

const BOM_SEED = [
  ['5KW Solar Kit', 'Mono PERC Panel 540W', 10],
  ['5KW Solar Kit', 'On-Grid Inverter 5KW', 1],
  ['5KW Solar Kit', 'MC4 Connector Pair', 20],
  ['10KW Solar Kit', 'Mono PERC Panel 540W', 20],
  ['10KW Solar Kit', 'On-Grid Inverter 10KW', 1],
  ['10KW Solar Kit', 'MC4 Connector Pair', 40],
  ['15KW Industrial Kit', 'Mono PERC Panel 540W', 28],
  ['15KW Industrial Kit', 'On-Grid Inverter 10KW', 2],
  ['15KW Industrial Kit', 'MC4 Connector Pair', 56]
] as const

function canRunReset(): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  return process.env.ALLOW_INVENTORY_TEST_RESET_IN_PROD === 'true'
}

async function createRequestClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  const accessToken = token ? decodeURIComponent(token) : null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    return { client: null, accessToken: null }
  }

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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

  return { client, accessToken }
}

async function resetByApiFallback(client: any, organizationId: string) {
  await client.from('stock_transactions').delete().eq('organization_id', organizationId)
  await client.from('system_components').delete().eq('organization_id', organizationId)
  await client.from('systems').delete().eq('organization_id', organizationId)
  await client.from('spares').delete().eq('organization_id', organizationId)

  const { error: spareInsertError } = await client
    .from('spares')
    .insert(SPARE_SEED.map((row) => ({ organization_id: organizationId, ...row })))
  if (spareInsertError) throw new Error(spareInsertError.message)

  const { error: systemInsertError } = await client
    .from('systems')
    .insert(SYSTEM_SEED.map((row) => ({ organization_id: organizationId, ...row })))
  if (systemInsertError) throw new Error(systemInsertError.message)

  const { data: spares, error: sparesFetchError } = await client
    .from('spares')
    .select('id, name, stock_quantity')
    .eq('organization_id', organizationId)
  if (sparesFetchError) throw new Error(sparesFetchError.message)

  const { data: systems, error: systemsFetchError } = await client
    .from('systems')
    .select('id, system_name')
    .eq('organization_id', organizationId)
  if (systemsFetchError) throw new Error(systemsFetchError.message)

  const spareMap = new Map((spares || []).map((row: any) => [row.name, row.id]))
  const systemMap = new Map((systems || []).map((row: any) => [row.system_name, row.id]))

  const bomRows = BOM_SEED.flatMap(([systemName, itemName, quantity]) => {
    const systemId = systemMap.get(systemName)
    const spareId = spareMap.get(itemName)
    if (!systemId || !spareId) return []
    return [{
      organization_id: organizationId,
      system_id: systemId,
      spare_id: spareId,
      quantity_required: quantity
    }]
  })

  const { error: bomInsertError } = await client.from('system_components').insert(bomRows)
  if (bomInsertError) throw new Error(bomInsertError.message)

  const stockTxRows = (spares || []).map((row: any) => ({
    organization_id: organizationId,
    spare_id: row.id,
    type: 'adjustment',
    quantity: row.stock_quantity || 0,
    reference: 'TEST_SEED_INIT_FALLBACK'
  }))

  const { error: stockTxError } = await client.from('stock_transactions').insert(stockTxRows)
  if (stockTxError) throw new Error(stockTxError.message)

  return {
    success: true,
    mode: 'api_fallback',
    seeded: {
      spares: SPARE_SEED.length,
      systems: SYSTEM_SEED.length,
      system_components: bomRows.length,
      stock_transactions: stockTxRows.length
    }
  }
}

export async function POST() {
  try {
    if (!canRunReset()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN_ENVIRONMENT',
            message: 'Inventory reset is disabled in this environment'
          }
        },
        { status: 403 }
      )
    }

    const { client, accessToken } = await createRequestClient()
    if (!client || !accessToken) {
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

    const { data: userData, error: authError } = await client.auth.getUser(accessToken)
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

    const { organizationId } = await getRequestContext()

    const { data: userRow, error: roleError } = await client
      .from('users')
      .select('role')
      .eq('id', userData.user.id)
      .eq('organization_id', organizationId)
      .limit(1)
      .maybeSingle()

    if (roleError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ROLE_CHECK_FAILED',
            message: roleError.message
          }
        },
        { status: 400 }
      )
    }

    if (!userRow || userRow.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only admin users can run inventory reset'
          }
        },
        { status: 403 }
      )
    }

    const { data: resetResult, error: resetError } = await (client as any).rpc('reset_inventory_test_data', {
      p_organization_id: organizationId,
      p_confirm: 'RESET_INVENTORY_TEST_DATA'
    })

    if (resetError) {
      const rawMessage = String(resetError.message || '')
      const missingFunctionInCache =
        rawMessage.toLowerCase().includes('reset_inventory_test_data') &&
        rawMessage.toLowerCase().includes('schema cache')
      const ambiguousOverload =
        rawMessage.toLowerCase().includes('could not choose the best candidate function') &&
        rawMessage.toLowerCase().includes('reset_inventory_test_data')

      if (missingFunctionInCache || ambiguousOverload) {
        const fallbackResult = await resetByApiFallback(client, organizationId)
        return NextResponse.json(
          {
            success: true,
            data: fallbackResult
          },
          { status: 200 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RESET_FAILED',
            message: rawMessage
          }
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: resetResult
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RESET_API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}
