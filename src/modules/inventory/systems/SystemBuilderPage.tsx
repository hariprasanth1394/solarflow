"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Copy, Pencil, Trash2, X, Zap } from "lucide-react"
import AddComponentModal from "./AddComponentModal"
import CreateSystemModal from "./CreateSystemModal"
import EditSystemModal from "./EditSystemModal"
import SystemComponentsTable from "./SystemComponentsTable"
import InventoryPageShell from "../components/InventoryPageShell"
import InventoryStatCard from "../components/InventoryStatCard"
import SystemListPanel from "../components/SystemListPanel"
import type { SystemCarouselItem } from "../components/SystemCardCarousel"
import {
  addSystemComponent,
  createSystem,
  deleteSystem,
  getSparesForSystemBuilder,
  getSystemComponents,
  getSystems,
  removeSystemComponent,
  updateSystem,
} from "../../../services/systemService"

type SystemRow = {
  id: string
  system_name: string
  capacity_kw: number
  description: string | null
  price: number | null
}

type ComponentApiRow = {
  id: string
  quantity_required: number
  spare_id: string
  spares:
    | { name: string; unit: string | null; stock_quantity: number; min_stock: number }
    | { name: string; unit: string | null; stock_quantity: number; min_stock: number }[]
    | null
}

type ComponentRow = {
  id: string
  spare_id: string
  quantity_required: number
  spare_name: string
  unit: string | null
  stock_quantity: number
  min_stock: number
}

type SpareOption = {
  id: string
  name: string
  unit: string | null
  stock_quantity: number
  min_stock: number
}

type SystemStats = {
  componentCount: number
  totalUnits: number
}

type CapacityFilter = "all" | "small" | "medium" | "large"

type ToastState = {
  tone: "success" | "error"
  text: string
} | null

function getSpareMeta(value: ComponentApiRow["spares"]) {
  if (!value) return { name: "-", unit: null as string | null, stock_quantity: 0, min_stock: 0 }
  if (Array.isArray(value)) return value[0] ?? { name: "-", unit: null, stock_quantity: 0, min_stock: 0 }
  return value
}

function computeAvailability(components: ComponentRow[]) {
  if (!components.length) return 0
  return Math.min(
    ...components.map((row) =>
      row.quantity_required > 0 ? Math.floor(row.stock_quantity / row.quantity_required) : 0
    )
  )
}

function formatSystemPrice(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

function makeDuplicateSystemName(baseName: string, existingNames: string[]) {
  const normalized = new Set(existingNames.map((name) => name.trim().toLowerCase()))
  let candidate = `${baseName} Copy`
  let index = 2
  while (normalized.has(candidate.toLowerCase())) {
    candidate = `${baseName} Copy (${index})`
    index += 1
  }
  return candidate
}

export default function SystemBuilderPage() {
  const [systems, setSystems] = useState<SystemRow[]>([])
  const [selectedSystem, setSelectedSystem] = useState<SystemRow | null>(null)
  const [components, setComponents] = useState<ComponentRow[]>([])
  const [spares, setSpares] = useState<SpareOption[]>([])
  const [systemStats, setSystemStats] = useState<Record<string, SystemStats>>({})
  const [systemsLoading, setSystemsLoading] = useState(false)
  const [componentsLoading, setComponentsLoading] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [systemActionLoading, setSystemActionLoading] = useState(false)
  const [componentSubmitting, setComponentSubmitting] = useState(false)
  const [componentModalOpen, setComponentModalOpen] = useState(false)
  const [systemModalOpen, setSystemModalOpen] = useState(false)
  const [editSystemModalOpen, setEditSystemModalOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [search, setSearch] = useState("")
  const [capacityFilter, setCapacityFilter] = useState<CapacityFilter>("all")
  const [mobileView, setMobileView] = useState<"list" | "detail">("list")

  const loadSystems = useCallback(async () => {
    setSystemsLoading(true)
    try {
      const { data, error } = await getSystems()
      if (error) throw error
      const nextSystems = ((data as SystemRow[]) ?? []).map((row) => ({
        ...row,
        price: row.price ?? null,
      }))
      setSystems(nextSystems)
      return nextSystems
    } catch (error) {
      setToast({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to load systems.",
      })
      return []
    } finally {
      setSystemsLoading(false)
    }
  }, [])

  const loadSpares = useCallback(async () => {
    const { data } = await getSparesForSystemBuilder()
    setSpares((data as SpareOption[]) ?? [])
  }, [])

  const loadComponents = useCallback(async (systemId: string) => {
    setComponentsLoading(true)
    const { data } = await getSystemComponents(systemId)
    const mapped = ((data as ComponentApiRow[]) ?? []).map((row) => {
      const spare = getSpareMeta(row.spares)
      return {
        id: row.id,
        spare_id: row.spare_id,
        quantity_required: row.quantity_required,
        spare_name: spare.name,
        unit: spare.unit,
        stock_quantity: spare.stock_quantity ?? 0,
        min_stock: spare.min_stock ?? 0,
      }
    })
    setComponents(mapped)
    setSystemStats((prev) => ({
      ...prev,
      [systemId]: {
        componentCount: mapped.length,
        totalUnits: mapped.reduce((sum, row) => sum + row.quantity_required, 0),
      },
    }))
    setComponentsLoading(false)
    return mapped
  }, [])

  const loadAllSystemStats = useCallback(async (systemRows: SystemRow[]) => {
    const entries = await Promise.all(
      systemRows.map(async (system) => {
        const { data } = await getSystemComponents(system.id)
        const mapped = ((data as ComponentApiRow[]) ?? []).map((row) => row.quantity_required)
        return [
          system.id,
          { componentCount: mapped.length, totalUnits: mapped.reduce((sum, qty) => sum + qty, 0) },
        ] as const
      })
    )
    setSystemStats(Object.fromEntries(entries))
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      const nextSystems = await loadSystems()
      await loadSpares()
      if (!active || !nextSystems.length) return
      void loadAllSystemStats(nextSystems)
    })()
    return () => {
      active = false
    }
  }, [loadAllSystemStats, loadSpares, loadSystems])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!systems.length) {
      setSelectedSystem(null)
      setComponents([])
      return
    }

    const isDesktopLayout = window.matchMedia("(min-width: 961px)").matches
    if (!isDesktopLayout) return

    setSelectedSystem((current) => {
      if (current && systems.some((system) => system.id === current.id)) {
        return current
      }
      const first = systems[0]
      void loadComponents(first.id)
      return first
    })
  }, [loadComponents, systems])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 961px)")

    const handleLayoutChange = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) {
        if (!systems.length) return
        setMobileView("list")
        setSelectedSystem((current) => {
          if (current && systems.some((system) => system.id === current.id)) return current
          const first = systems[0]
          void loadComponents(first.id)
          return first
        })
        return
      }

      setMobileView("list")
    }

    handleLayoutChange(mediaQuery)
    mediaQuery.addEventListener("change", handleLayoutChange)
    return () => mediaQuery.removeEventListener("change", handleLayoutChange)
  }, [loadComponents, systems])

  const listSystems: SystemCarouselItem[] = useMemo(
    () =>
      systems.map((system) => ({
        id: system.id,
        system_name: system.system_name,
        capacity_kw: system.capacity_kw,
        componentCount: systemStats[system.id]?.componentCount ?? 0,
        totalUnits: systemStats[system.id]?.totalUnits ?? 0,
      })),
    [systemStats, systems]
  )

  const componentCount = components.length
  const totalQuantity = components.reduce((sum, row) => sum + row.quantity_required, 0)
  const availabilityCount = computeAvailability(components)

  const handleSelectSystem = (systemId: string) => {
    const system = systems.find((item) => item.id === systemId)
    if (!system) return
    setSelectedSystem(system)
    setMobileView("detail")
    void loadComponents(system.id)
  }

  const handleDuplicateSystem = async () => {
    if (!selectedSystem || systemActionLoading) return
    setSystemActionLoading(true)
    try {
      const duplicateName = makeDuplicateSystemName(
        selectedSystem.system_name,
        systems.map((system) => system.system_name)
      )
      const { data } = await createSystem({
        system_name: duplicateName,
        capacity_kw: selectedSystem.capacity_kw,
        description: selectedSystem.description,
        price: selectedSystem.price,
      })
      if (!data) {
        throw new Error("Could not duplicate system.")
      }

      const created = data as SystemRow
      for (const component of components) {
        await addSystemComponent({
          system_id: created.id,
          spare_id: component.spare_id,
          quantity_required: component.quantity_required,
        })
      }

      setToast({ tone: "success", text: "System duplicated." })
      const nextSystems = await loadSystems()
      await loadAllSystemStats(nextSystems)
      setSelectedSystem({ ...created, price: created.price ?? null })
      setMobileView("detail")
      await loadComponents(created.id)
    } catch (error) {
      setToast({ tone: "error", text: error instanceof Error ? error.message : "Operation failed" })
    } finally {
      setSystemActionLoading(false)
    }
  }

  const handleOpenEdit = () => {
    if (!selectedSystem || systemActionLoading) return
    setEditSystemModalOpen(true)
  }

  const handleDeleteSystem = async () => {
    if (!selectedSystem || systemActionLoading) return
    const confirmed = window.confirm(`Delete ${selectedSystem.system_name}? This action cannot be undone.`)
    if (!confirmed) return

    setSystemActionLoading(true)
    try {
      const { error } = await deleteSystem(selectedSystem.id)
      if (error) throw new Error("Operation failed")

      setToast({ tone: "success", text: "System deleted." })
      const nextSystems = await loadSystems()
      await loadAllSystemStats(nextSystems)

      if (nextSystems.length) {
        const isDesktopLayout = window.matchMedia("(min-width: 961px)").matches
        if (isDesktopLayout) {
          const first = nextSystems[0]
          setSelectedSystem(first)
          await loadComponents(first.id)
        } else {
          setSelectedSystem(null)
          setComponents([])
          setMobileView("list")
        }
      } else {
        setSelectedSystem(null)
        setComponents([])
        setMobileView("list")
      }
    } catch (error) {
      setToast({ tone: "error", text: error instanceof Error ? error.message : "Operation failed" })
    } finally {
      setSystemActionLoading(false)
    }
  }

  return (
    <InventoryPageShell contentOnly>
      {toast ? (
        <div className={`inv-toast inv-toast--${toast.tone}`} role="status">
          <span>{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} className="inv-toast-close" aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div
        className={`inv-master-detail ${
          mobileView === "detail" ? "inv-master-detail--detail-mobile" : "inv-master-detail--list-mobile"
        }`}
      >
        <div className="inv-master-detail-list">
          <SystemListPanel
            systems={listSystems}
            selectedId={selectedSystem?.id ?? null}
            loading={systemsLoading}
            search={search}
            capacityFilter={capacityFilter}
            onSearchChange={setSearch}
            onCapacityFilterChange={setCapacityFilter}
            onSelect={handleSelectSystem}
            onCreateSystem={() => setSystemModalOpen(true)}
          />
        </div>

        <div className="inv-master-detail-panel">
          {!selectedSystem ? (
            <div className="inv-detail-empty inv-elevated-card">
              <p className="inv-systems-empty-title">Select a system</p>
              <p className="inv-systems-empty-text">Choose from the list or create a new system.</p>
            </div>
          ) : (
            <>
              {mobileView === "detail" ? (
                <button
                  type="button"
                  className="inv-mobile-back"
                  onClick={() => setMobileView("list")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  All systems
                </button>
              ) : null}

              <section className="inv-detail-header inv-elevated-card">
                <div className="inv-system-card-icon" aria-hidden="true">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="inv-detail-header-body">
                  <div className="inv-detail-header-title-row">
                    <h2 className="inv-system-card-title">{selectedSystem.system_name}</h2>
                    <div className="inv-detail-header-actions inv-detail-icon-actions">
                      <button
                        type="button"
                        className="inv-row-action inv-detail-icon-btn"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleDuplicateSystem()
                        }}
                        disabled={systemActionLoading}
                        title="Duplicate system"
                        aria-label="Duplicate system"
                      >
                        <Copy className="pointer-events-none h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inv-row-action inv-detail-icon-btn"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleOpenEdit()
                        }}
                        disabled={systemActionLoading}
                        title="Edit system"
                        aria-label="Edit system"
                      >
                        <Pencil className="pointer-events-none h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inv-row-action inv-row-action--danger inv-detail-icon-btn"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleDeleteSystem()
                        }}
                        disabled={systemActionLoading}
                        title="Delete system"
                        aria-label="Delete system"
                      >
                        <Trash2 className="pointer-events-none h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="inv-system-card-meta">
                    {selectedSystem.description?.trim() || `${selectedSystem.capacity_kw} kW configuration`}
                  </p>
                </div>
              </section>

              <div className="inv-stat-grid inv-stat-grid--compact">
                <InventoryStatCard label="Capacity" value={`${selectedSystem.capacity_kw} kW`} tone="blue" />
                <InventoryStatCard label="Price" value={formatSystemPrice(selectedSystem.price)} />
                <InventoryStatCard label="Components" value={componentCount} tone="accent" />
                <InventoryStatCard label="Availability" value={`${availabilityCount} builds`} tone={availabilityCount > 0 ? "success" : "danger"} />
              </div>

              <SystemComponentsTable
                rows={components}
                loading={componentsLoading}
                systemName={selectedSystem.system_name}
                onAddComponent={() => setComponentModalOpen(true)}
                onRemove={async (componentId) => {
                  try {
                    await removeSystemComponent(componentId)
                    setToast({ tone: "success", text: "Component removed." })
                    await loadComponents(selectedSystem.id)
                  } catch (error) {
                    setToast({ tone: "error", text: error instanceof Error ? error.message : "Operation failed" })
                  }
                }}
              />
            </>
          )}
        </div>
      </div>

      <CreateSystemModal
        open={systemModalOpen}
        loading={createLoading}
        onClose={() => {
          if (!createLoading) setSystemModalOpen(false)
        }}
        onSubmit={async ({ system_name, capacity_kw }) => {
          setCreateLoading(true)
          try {
            const { data } = await createSystem({ system_name, capacity_kw, description: null })
            if (data) {
              const created = data as SystemRow
              setToast({ tone: "success", text: "System created." })
              setSystemModalOpen(false)
              const nextSystems = await loadSystems()
              await loadAllSystemStats(nextSystems)
              setSelectedSystem(created)
              setMobileView("detail")
              await loadComponents(created.id)
            }
          } catch (error) {
            setToast({ tone: "error", text: error instanceof Error ? error.message : "Operation failed" })
          } finally {
            setCreateLoading(false)
          }
        }}
      />

      <EditSystemModal
        open={editSystemModalOpen}
        loading={systemActionLoading}
        system={selectedSystem}
        onClose={() => {
          if (!systemActionLoading) setEditSystemModalOpen(false)
        }}
        onSubmit={async ({ system_name, capacity_kw, price }) => {
          if (!selectedSystem) return
          setSystemActionLoading(true)
          try {
            const { data } = await updateSystem(selectedSystem.id, { system_name, capacity_kw, price })
            if (!data) {
              throw new Error("Could not update system.")
            }

            const updated = { ...(data as SystemRow), price: (data as SystemRow).price ?? null }
            setToast({ tone: "success", text: "System updated." })
            setEditSystemModalOpen(false)
            const nextSystems = await loadSystems()
            await loadAllSystemStats(nextSystems)
            setSelectedSystem(updated)
          } catch (error) {
            setToast({ tone: "error", text: error instanceof Error ? error.message : "Operation failed" })
          } finally {
            setSystemActionLoading(false)
          }
        }}
      />

      <AddComponentModal
        open={componentModalOpen}
        loading={componentSubmitting || componentsLoading}
        spares={spares}
        onClose={() => {
          if (!componentSubmitting) setComponentModalOpen(false)
        }}
        onSubmit={async ({ spare_id, quantity_required }) => {
          if (!selectedSystem) return
          setComponentSubmitting(true)
          try {
            await addSystemComponent({
              system_id: selectedSystem.id,
              spare_id,
              quantity_required,
            })
            setToast({ tone: "success", text: "Component added." })
            setComponentModalOpen(false)
            await loadComponents(selectedSystem.id)
          } catch (error) {
            setToast({ tone: "error", text: error instanceof Error ? error.message : "Operation failed" })
          } finally {
            setComponentSubmitting(false)
          }
        }}
      />
    </InventoryPageShell>
  )
}
