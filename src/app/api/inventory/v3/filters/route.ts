import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { withOrganizationContext } from '@/utils/withOrganizationContext'

export const runtime = 'nodejs'

type CategoryOption = {
  id: string
  label: string
}

type SystemOption = {
  id: string
  label: string
  code: string
}

type CombinationOption = {
  categoryId: string
  categoryLabel: string
  systemId: string
  systemLabel: string
  systemCode: string
  rowCount: number
}

type JoinedStockRow = {
  item: {
    category: string | null
    is_active: boolean | null
    organization_id: string | null
  } | {
    category: string | null
    is_active: boolean | null
    organization_id: string | null
  }[] | null
  system: {
    id: string
    system_name: string | null
    system_code: string | null
  } | {
    id: string
    system_name: string | null
    system_code: string | null
  }[] | null
}

type BomRow = {
  system_id: string
  spare_id: string | null
}

type SpareCategoryRow = {
  id: string
  category: string | null
}

type SystemRow = {
  id: string
  system_name: string | null
  system_code: string | null
}

function encodeCategoryId(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
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

export async function GET() {
  try {
    return await withOrganizationContext(async (organizationId) => {
      const requestClient = await getRequestClient()
      const db = requestClient

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

      const legacyStockDb = db as any

      const stockJoinResult = await legacyStockDb
        .from('inventory_stock')
        .select('item:inventory_items(category, is_active, organization_id), system:systems(id, system_name, system_code)')
        .eq('organization_id', organizationId)

      if (stockJoinResult.error) throw stockJoinResult.error

      const rows = (stockJoinResult.data || []) as JoinedStockRow[]
      const categoryMap = new Map<string, CategoryOption>()
      const systemMap = new Map<string, SystemOption>()
      const combinationMap = new Map<string, CombinationOption>()

      const addCombination = (
        categoryLabelRaw: string,
        systemId: string,
        systemLabelRaw: string,
        systemCodeRaw: string
      ) => {
        const categoryLabel = String(categoryLabelRaw || '').trim()
        const systemLabel = String(systemLabelRaw || '').trim()
        const systemCode = String(systemCodeRaw || '').trim()
        if (!categoryLabel || !systemId || !systemLabel || !systemCode) return

        const categoryId = encodeCategoryId(categoryLabel)
        categoryMap.set(categoryId, { id: categoryId, label: categoryLabel })
        systemMap.set(systemId, { id: systemId, label: systemLabel, code: systemCode })

        const comboKey = `${categoryId}:${systemId}`
        const existing = combinationMap.get(comboKey)
        if (existing) {
          existing.rowCount += 1
        } else {
          combinationMap.set(comboKey, {
            categoryId,
            categoryLabel,
            systemId,
            systemLabel,
            systemCode,
            rowCount: 1
          })
        }
      }

      for (const row of rows) {
        const item = Array.isArray(row.item) ? row.item[0] : row.item
        const system = Array.isArray(row.system) ? row.system[0] : row.system
        if (!item || !system) continue
        if (item.is_active === false) continue
        if (item.organization_id && item.organization_id !== organizationId) continue

        const categoryLabel = String(item.category || '').trim()
        addCombination(
          categoryLabel,
          system.id,
          String(system.system_name || system.system_code || ''),
          String(system.system_code || system.system_name || '')
        )
      }

      if (combinationMap.size === 0) {
        const [bomResult, sparesResult, systemsResult] = await Promise.all([
          db
            .from('system_components')
            .select('system_id, spare_id')
            .eq('organization_id', organizationId),
          db
            .from('spares')
            .select('id, category')
            .eq('organization_id', organizationId),
          db
            .from('systems')
            .select('id, system_name, system_code')
            .eq('organization_id', organizationId)
        ])

        if (bomResult.error) throw bomResult.error
        if (sparesResult.error) throw sparesResult.error
        if (systemsResult.error) throw systemsResult.error

        const bomRows = (bomResult.data || []) as BomRow[]
        const spareRows = (sparesResult.data || []) as SpareCategoryRow[]
        const systemRows = (systemsResult.data || []) as unknown as SystemRow[]

        const spareById = new Map(spareRows.map((row) => [row.id, row]))
        const systemById = new Map(systemRows.map((row) => [row.id, row]))

        for (const row of bomRows) {
          const spare = row.spare_id ? spareById.get(row.spare_id) : null
          const system = systemById.get(row.system_id)
          if (!spare || !system) continue

          addCombination(
            String(spare.category || ''),
            system.id,
            String(system.system_name || system.system_code || ''),
            String(system.system_code || system.system_name || '')
          )
        }
      }

      const categories = Array.from(categoryMap.values()).sort((a, b) => a.label.localeCompare(b.label))
      const systems = Array.from(systemMap.values()).sort((a, b) => a.label.localeCompare(b.label))
      const combinations = Array.from(combinationMap.values()).sort((a, b) => {
        const categoryCompare = a.categoryLabel.localeCompare(b.categoryLabel)
        if (categoryCompare !== 0) return categoryCompare
        return a.systemLabel.localeCompare(b.systemLabel)
      })

      console.info('[inventory.filters] options_loaded', {
        organizationId,
        rowCount: rows.length,
        categoryCount: categories.length,
        systemCount: systems.length,
        combinationCount: combinations.length,
        dataSource: rows.length > 0 ? 'inventory_stock' : 'system_components_fallback'
      })

      return NextResponse.json(
        {
          success: true,
          data: {
            categories,
            systems,
            combinations
          }
        },
        { status: 200 }
      )
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_FILTERS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch inventory filters'
        }
      },
      { status: 500 }
    )
  }
}
