/**
 * System Availability Calculator
 * Calculates which systems can be built based on BOM and current stock
 * 
 * Formula: canBuild = MIN(stock / required) for each item in the BOM
 * Example: If BOM needs 4 panels and 2 inverters, and we have 20 panels and 10 inverters:
 *   - Panels can build: 20 / 4 = 5 systems
 *   - Inverters can build: 10 / 2 = 5 systems
 *   - Result: 5 systems (limited by whichever is lowest)
 */

import { supabase } from '../lib/supabaseClient'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface BomItem {
  itemId: string
  itemCode: string
  itemName: string
  requiredQty: number
  currentStock: number
  minimumStock: number
}

export interface SystemBom {
  systemId: string
  systemName: string
  items: BomItem[]
}

export interface SystemComponent {
  spareId: string
  spareName: string
  quantityRequired: number
  currentStock: number
  availableCount: number
  isShortage: boolean
  shortageQty: number
}

export interface SystemAvailability {
  systemId: string
  systemName: string
  canBuild: number
  status: 'available' | 'limited' | 'unavailable'
  shortageDetected: boolean
  limitingFactor?: {
    itemCode: string
    itemName: string
    available: number
    required: number
  }
  missingComponents?: Array<{
    spareName: string
    required: number
    available: number
    shortage: number
  }>
  components?: SystemComponent[]
}

export interface SystemAvailabilityReport {
  systems: SystemAvailability[]
  lowStockAlerts: Array<{
    spareName: string
    currentStock: number
    minStock: number
    stockLevel: 'low' | 'critical'
  }>
  shortageItems: Array<{
    spareName: string
    requiredQty: number
    availableQty: number
    shortageQty: number
  }>
}

// ============================================================
// CALCULATE AVAILABILITY FOR ALL SYSTEMS
// ============================================================

export async function calculateSystemAvailability(
  organizationId: string
): Promise<SystemAvailabilityReport | null> {
  try {
    // Fetch systems with components
    const { data: systems, error: systemsError } = await supabase
      .from('systems')
      .select(
        `
        id,
        system_name,
        system_components (
          id,
          spare_id,
          quantity_required,
          spares (
            id,
            name,
            stock_quantity,
            min_stock
          )
        )
      `
      )
      .eq('organization_id', organizationId)

    if (systemsError) throw systemsError

    if (!systems || systems.length === 0) {
      return {
        systems: [],
        lowStockAlerts: [],
        shortageItems: []
      }
    }

    // Calculate availability for each system
    const systemAvailabilities: SystemAvailability[] = systems.map((system: any) => {
      const components: SystemComponent[] = (system.system_components || []).map(
        (component: any) => ({
          spareId: component.spare_id,
          spareName: component.spares?.name || 'Unknown',
          quantityRequired: component.quantity_required,
          currentStock: component.spares?.stock_quantity || 0,
          availableCount: Math.floor((component.spares?.stock_quantity || 0) / component.quantity_required),
          isShortage: (component.spares?.stock_quantity || 0) < component.quantity_required,
          shortageQty: Math.max(
            0,
            component.quantity_required - (component.spares?.stock_quantity || 0)
          )
        })
      )

      // Calculate minimum available (bottleneck)
      const canBuild =
        components.length > 0
          ? Math.min(...components.map((c) => c.availableCount))
          : 0

      const missingComponents = components.filter((c) => c.isShortage)

      // Determine status
      let status: 'available' | 'limited' | 'unavailable' = 'unavailable'
      if (canBuild >= 5) status = 'available'
      else if (canBuild > 0) status = 'limited'
      else status = 'unavailable'

      return {
        systemId: system.id,
        systemName: system.system_name,
        canBuild,
        status,
        shortageDetected: missingComponents.length > 0,
        components,
        missingComponents: missingComponents.map((component) => ({
          spareName: component.spareName,
          required: component.quantityRequired,
          available: component.currentStock,
          shortage: component.shortageQty
        }))
      }
    })

    // Identify low stock alerts
    const { data: spares, error: sparesError } = await supabase
      .from('spares')
      .select('*')
      .eq('organization_id', organizationId)

    if (sparesError) throw sparesError

    const lowStockAlerts: SystemAvailabilityReport['lowStockAlerts'] = (spares || [])
      .filter((spare: any) => spare.stock_quantity <= spare.min_stock)
      .map((spare: any) => ({
        spareName: spare.name,
        currentStock: spare.stock_quantity,
        minStock: spare.min_stock,
        stockLevel: (spare.stock_quantity === 0 ? 'critical' : 'low') as 'critical' | 'low'
      }))
      .sort((a: any, b: any) => a.currentStock - b.currentStock)

    // Identify shortage items
    const shortageItems = systemAvailabilities
      .flatMap((sys) =>
        (sys.missingComponents || []).map((comp) => ({
          spareName: comp.spareName,
          requiredQty: comp.required,
          availableQty: comp.available,
          shortageQty: comp.shortage
        }))
      )
      .filter((item, index, self) =>
        index === self.findIndex((t) => t.spareName === item.spareName)
      ) // Remove duplicates

    return {
      systems: systemAvailabilities,
      lowStockAlerts,
      shortageItems
    }
  } catch (error) {
    console.error('Failed to calculate system availability:', error)
    return null
  }
}

// ============================================================
// CALCULATE IMPACT OF IMPORT BATCH
// ============================================================

export async function calculateImportImpact(
  organizationId: string,
  importedItems: Array<{
    spareId: string
    currentStock: number
    closingStock: number
  }>
): Promise<{
  beforeAvailability: SystemAvailability[]
  afterAvailability: SystemAvailability[]
  systemsAffected: string[]
  shortagesBefore: number
  shortagesAfter: number
}> {
  try {
    // Get current availability
    const beforeReport = await calculateSystemAvailability(organizationId)
    const beforeAvailability = beforeReport?.systems || []
    const shortagesBefore = beforeReport?.shortageItems.length || 0

    // Create temporary stock state after import
    const stockChanges = new Map(
      importedItems.map((item) => [item.spareId, item.closingStock])
    )

    // Fetch systems
    const { data: systems, error: systemsError } = await supabase
      .from('systems')
      .select(
        `
        id,
        system_name,
        system_components (
          id,
          spare_id,
          quantity_required,
          spares (
            id,
            name,
            stock_quantity,
            min_stock
          )
        )
      `
      )
      .eq('organization_id', organizationId)

    if (systemsError) throw systemsError

    // Calculate after availability
    const afterAvailability: SystemAvailability[] = (systems || []).map(
      (system: any) => {
        const components: SystemComponent[] = (system.system_components || []).map(
          (component: any) => {
            const stock =
              stockChanges.get(component.spare_id) ||
              component.spares?.stock_quantity ||
              0

            return {
              spareId: component.spare_id,
              spareName: component.spares?.name || 'Unknown',
              quantityRequired: component.quantity_required,
              currentStock: stock,
              availableCount: Math.floor(stock / component.quantity_required),
              isShortage: stock < component.quantity_required,
              shortageQty: Math.max(0, component.quantity_required - stock)
            }
          }
        )

        const canBuild =
          components.length > 0
            ? Math.min(...components.map((c) => c.availableCount))
            : 0

        let status: 'available' | 'limited' | 'unavailable' = 'unavailable'
        if (canBuild >= 5) status = 'available'
        else if (canBuild > 0) status = 'limited'

        return {
          systemId: system.id,
          systemName: system.system_name,
          canBuild,
          status,
          components,
          shortageDetected: components.some((c) => c.isShortage),
          missingComponents: components
            .filter((c) => c.isShortage)
            .map((component) => ({
              spareName: component.spareName,
              required: component.quantityRequired,
              available: component.currentStock,
              shortage: component.shortageQty
            }))
        }
      }
    )

    // Count shortages after
    const shortagesAfter = afterAvailability.reduce(
      (count, sys) => count + (sys.missingComponents?.length || 0),
      0
    )

    // Identify affected systems
    const affectedSystems = afterAvailability
      .filter((after) => {
        const before = beforeAvailability.find((b) => b.systemId === after.systemId)
        return !before || before.canBuild !== after.canBuild
      })
      .map((sys) => sys.systemName)

    return {
      beforeAvailability,
      afterAvailability,
      systemsAffected: affectedSystems,
      shortagesBefore,
      shortagesAfter
    }
  } catch (error) {
    console.error('Failed to calculate import impact:', error)
    return {
      beforeAvailability: [],
      afterAvailability: [],
      systemsAffected: [],
      shortagesBefore: 0,
      shortagesAfter: 0
    }
  }
}
// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Calculate system availability for a single BOM
 */
export function calculateSystemAvailabilityForBom(systemBom: SystemBom): SystemAvailability {
  let minAvailable = Infinity
  let limitingFactor: SystemAvailability['limitingFactor'] | undefined
  const missingComponents: SystemAvailability['missingComponents'] = []

  // Calculate available units for each component
  systemBom.items.forEach((item) => {
    const available = Math.floor(item.currentStock / item.requiredQty)

    // Track the limiting factor (bottleneck)
    if (available < minAvailable) {
      minAvailable = available
      limitingFactor = {
        itemCode: item.itemCode,
        itemName: item.itemName,
        available: item.currentStock,
        required: item.requiredQty
      }
    }

    // Check for shortages
    if (item.currentStock < item.requiredQty) {
      missingComponents.push({
        spareName: item.itemName,
        required: item.requiredQty,
        available: item.currentStock,
        shortage: item.requiredQty - item.currentStock
      })
    }
  })

  // Handle edge case where system has no items
  if (minAvailable === Infinity) {
    minAvailable = 0
  }

  // Determine status
  let status: 'available' | 'limited' | 'unavailable'
  if (minAvailable === 0) {
    status = 'unavailable'
  } else if (minAvailable < 5) {
    status = 'limited'
  } else {
    status = 'available'
  }

  return {
    systemId: systemBom.systemId,
    systemName: systemBom.systemName,
    canBuild: minAvailable,
    status,
    shortageDetected: missingComponents.length > 0,
    limitingFactor,
    missingComponents: missingComponents.length > 0 ? missingComponents : undefined
  }
}

/**
 * Find critical items blocking production
 */
export function findCriticalItems(
  systems: SystemAvailability[]
): Array<{
  itemCode: string
  itemName: string
  affectedSystems: number
  totalShortage: number
}> {
  const itemMap = new Map<string, any>()

  systems.forEach((system) => {
    if (system.missingComponents) {
      system.missingComponents.forEach((comp) => {
        const key = comp.spareName
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            itemCode: comp.spareName,
            itemName: comp.spareName,
            affectedSystems: 0,
            totalShortage: 0
          })
        }
        const item = itemMap.get(key)
        item.affectedSystems += 1
        item.totalShortage += comp.shortage
      })
    }
  })

  return Array.from(itemMap.values()).sort((a, b) => b.totalShortage - a.totalShortage)
}

/**
 * Generate procurement recommendations
 */
export function generateProcurementRecommendations(
  systems: SystemAvailability[],
  targetCapacity: number = 10
): Array<{
  itemName: string
  currentStock: number
  recommendedOrder: number
  priority: 'critical' | 'high' | 'medium'
}> {
  const recommendations = new Map<string, any>()

  systems.forEach((system) => {
    if (system.missingComponents) {
      system.missingComponents.forEach((comp) => {
        const key = comp.spareName
        const shortage = comp.shortage

        if (!recommendations.has(key)) {
          recommendations.set(key, {
            itemName: comp.spareName,
            currentStock: comp.available,
            recommendedOrder: shortage,
            priority: shortage > 0 ? 'critical' : 'medium'
          })
        } else {
          const rec = recommendations.get(key)
          rec.recommendedOrder = Math.max(rec.recommendedOrder, shortage)
          if (shortage > 0) rec.priority = 'critical'
        }
      })
    }
  })

  return Array.from(recommendations.values())
    .sort((a, b) => {
      const priorityOrder: Record<'critical' | 'high' | 'medium', number> = { critical: 0, high: 1, medium: 2 }
      return priorityOrder[a.priority as 'critical' | 'high' | 'medium'] - priorityOrder[b.priority as 'critical' | 'high' | 'medium']
    })
}