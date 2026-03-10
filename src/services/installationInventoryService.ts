import {
  insertInventoryMovements,
  queryInventoryMovementsByReferences,
  querySystemComponentsBySystemId
} from "../repositories/inventoryRepository"
import { elapsedMs, logError, logInfo, startTimer } from "../utils/logger"
import { withRequestContext } from "../utils/withRequestContext"

type InventoryComponent = {
  spare_id: string
  quantity_required: number
  spares: { id: string; stock_quantity: number | null } | { id: string; stock_quantity: number | null }[] | null
}

function asNumber(value: number | null | undefined) {
  return Number(value ?? 0)
}

function getSpareStock(component: InventoryComponent) {
  const row = Array.isArray(component.spares) ? component.spares[0] : component.spares
  return asNumber(row?.stock_quantity)
}

function reserveReference(customerId: string, spareId: string) {
  return `reserve:${customerId}:${spareId}`
}

function releaseReference(customerId: string, spareId: string) {
  return `release:${customerId}:${spareId}`
}

function consumeReference(customerId: string, spareId: string) {
  return `consume:${customerId}:${spareId}`
}

async function reserveInventoryInternal(params: {
  organizationId: string
  customerId: string
  systemId: string
}) {
  const startedAt = startTimer()
  try {
    const componentsRes = await querySystemComponentsBySystemId(params.organizationId, params.systemId)
    const components = (componentsRes.data ?? []) as InventoryComponent[]

    if (components.length === 0) {
      return { reservedCount: 0, skipped: true }
    }

    const refs = components.map((component) => reserveReference(params.customerId, component.spare_id))
    const existingRes = await queryInventoryMovementsByReferences(params.organizationId, refs)
    const existingRows = (existingRes.data ?? []) as Array<{ reference: string | null }>
    const existing = new Set(existingRows.map((row) => row.reference).filter(Boolean))

    const rows = components
      .filter((component) => !existing.has(reserveReference(params.customerId, component.spare_id)))
      .map((component) => {
        const quantity = asNumber(component.quantity_required)
        const stock = getSpareStock(component)
        if (quantity <= 0 || stock < quantity) return null

        return {
          customer_id: params.customerId,
          system_id: params.systemId,
          spare_id: component.spare_id,
          movement_type: "reserve" as const,
          quantity,
          reference: reserveReference(params.customerId, component.spare_id),
          notes: "Reserved for installation"
        }
      })
      .filter(Boolean) as Array<{
        customer_id: string
        system_id: string
        spare_id: string
        movement_type: "reserve"
        quantity: number
        reference: string
        notes: string
      }>

    await insertInventoryMovements(params.organizationId, rows)

    logInfo("Customer installation inventory reserved", {
      service: "installationInventoryService",
      organizationId: params.organizationId,
      customerId: params.customerId,
      systemId: params.systemId,
      rows: rows.length,
      durationMs: elapsedMs(startedAt)
    })

    return { reservedCount: rows.length, skipped: false }
  } catch (error) {
    logError("Customer installation reserve failed", error, {
      service: "installationInventoryService",
      organizationId: params.organizationId,
      customerId: params.customerId,
      systemId: params.systemId,
      durationMs: elapsedMs(startedAt)
    })
    throw new Error("Operation failed")
  }
}

async function consumeInventoryInternal(params: {
  organizationId: string
  customerId: string
  systemId: string
}) {
  const startedAt = startTimer()
  try {
    const componentsRes = await querySystemComponentsBySystemId(params.organizationId, params.systemId)
    const components = (componentsRes.data ?? []) as InventoryComponent[]

    if (components.length === 0) {
      return { consumedCount: 0, skipped: true }
    }

    const refs = components.flatMap((component) => [
      reserveReference(params.customerId, component.spare_id),
      releaseReference(params.customerId, component.spare_id),
      consumeReference(params.customerId, component.spare_id)
    ])

    const existingRes = await queryInventoryMovementsByReferences(params.organizationId, refs)
    const existingRows = (existingRes.data ?? []) as Array<{ reference: string | null }>
    const existing = new Set(existingRows.map((row) => row.reference).filter(Boolean))

    const rows = components
      .flatMap((component) => {
        const quantity = asNumber(component.quantity_required)
        if (quantity <= 0) return []

        const reserveRef = reserveReference(params.customerId, component.spare_id)
        const releaseRef = releaseReference(params.customerId, component.spare_id)
        const consumeRef = consumeReference(params.customerId, component.spare_id)

        if (!existing.has(reserveRef) || existing.has(consumeRef) || existing.has(releaseRef)) {
          return []
        }

        return [
          {
            customer_id: params.customerId,
            system_id: params.systemId,
            spare_id: component.spare_id,
            movement_type: "release" as const,
            quantity,
            reference: releaseRef,
            notes: "Released before consume conversion"
          },
          {
            customer_id: params.customerId,
            system_id: params.systemId,
            spare_id: component.spare_id,
            movement_type: "consume" as const,
            quantity,
            reference: consumeRef,
            notes: "Consumed on installation start"
          }
        ]
      })

    await insertInventoryMovements(params.organizationId, rows)

    logInfo("Reserved inventory converted to consumed", {
      service: "installationInventoryService",
      organizationId: params.organizationId,
      customerId: params.customerId,
      systemId: params.systemId,
      rows: rows.length,
      durationMs: elapsedMs(startedAt)
    })

    return { consumedCount: rows.length / 2, skipped: false }
  } catch (error) {
    logError("Reserved inventory consume failed", error, {
      service: "installationInventoryService",
      organizationId: params.organizationId,
      customerId: params.customerId,
      systemId: params.systemId,
      durationMs: elapsedMs(startedAt)
    })
    throw new Error("Operation failed")
  }
}

export async function reserveInventoryForCustomerInstallation(params: { customerId: string; systemId: string }) {
  return withRequestContext(async ({ organizationId }) => {
    return reserveInventoryInternal({
      organizationId,
      customerId: params.customerId,
      systemId: params.systemId
    })
  })
}

export async function reserveInventoryForCustomerInstallationWithContext(params: {
  organizationId: string
  customerId: string
  systemId: string
}) {
  return reserveInventoryInternal(params)
}

export async function consumeReservedInventoryForInstallation(params: { customerId: string; systemId: string }) {
  return withRequestContext(async ({ organizationId }) => {
    return consumeInventoryInternal({
      organizationId,
      customerId: params.customerId,
      systemId: params.systemId
    })
  })
}

export async function consumeReservedInventoryForInstallationWithContext(params: {
  organizationId: string
  customerId: string
  systemId: string
}) {
  return consumeInventoryInternal(params)
}
