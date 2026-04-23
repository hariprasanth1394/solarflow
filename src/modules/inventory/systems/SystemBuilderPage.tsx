"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, Plus, X } from "lucide-react"
import AddComponentModal from "./AddComponentModal"
import CreateSystemModal from "./CreateSystemModal"
import SystemComponentsTable from "./SystemComponentsTable"
import InventoryPageShell from "../components/InventoryPageShell"
import { inventorySectionCardClass } from "../components/inventoryTableStyles"
import {
  addSystemComponent,
  createSystem,
  getSparesForSystemBuilder,
  getSystemComponents,
  getSystems,
  removeSystemComponent
} from "../../../services/systemService"

type SystemRow = {
  id: string
  system_name: string
  capacity_kw: number
  description: string | null
}

type ComponentApiRow = {
  id: string
  quantity_required: number
  spares: { name: string; unit: string | null } | { name: string; unit: string | null }[] | null
}

type ComponentRow = {
  id: string
  quantity_required: number
  spare_name: string
  unit: string | null
}

type SpareOption = { id: string; name: string; unit: string | null }

type ToastState = {
  tone: 'success' | 'error'
  text: string
} | null

function getSpareMeta(value: ComponentApiRow["spares"]) {
  if (!value) return { name: "-", unit: null as string | null }
  if (Array.isArray(value)) return value[0] ?? { name: "-", unit: null }
  return value
}

export default function SystemBuilderPage() {
  const [systems, setSystems] = useState<SystemRow[]>([])
  const [selectedSystem, setSelectedSystem] = useState<SystemRow | null>(null)
  const [components, setComponents] = useState<ComponentRow[]>([])
  const [spares, setSpares] = useState<SpareOption[]>([])
  const [systemsLoading, setSystemsLoading] = useState(false)
  const [componentsLoading, setComponentsLoading] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [componentSubmitting, setComponentSubmitting] = useState(false)
  const [componentModalOpen, setComponentModalOpen] = useState(false)
  const [systemModalOpen, setSystemModalOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loadSystems = useCallback(async () => {
    setSystemsLoading(true)
    const { data } = await getSystems()
    setSystems(data as SystemRow[])
    setSystemsLoading(false)
  }, [])

  const loadSpares = useCallback(async () => {
    const { data } = await getSparesForSystemBuilder()
    setSpares(data as SpareOption[])
  }, [])

  const loadComponents = useCallback(async (systemId: string) => {
    setComponentsLoading(true)
    const { data } = await getSystemComponents(systemId)
    const mapped = (data as ComponentApiRow[]).map((row) => {
      const spare = getSpareMeta(row.spares)
      return {
        id: row.id,
        quantity_required: row.quantity_required,
        spare_name: spare.name,
        unit: spare.unit
      }
    })
    setComponents(mapped)
    setComponentsLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      await Promise.all([loadSystems(), loadSpares()])
      if (!active) return
    })()
    return () => { active = false }
  }, [loadSystems, loadSpares])

  // Auto-dismiss toast after 2.5s
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
    if (selectedSystem && systems.some((s) => s.id === selectedSystem.id)) return
    const first = systems[0]
    setSelectedSystem(first)
    void loadComponents(first.id)
  }, [loadComponents, selectedSystem, systems])

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [dropdownOpen])

  const handleSelectSystem = (system: SystemRow) => {
    setSelectedSystem(system)
    setDropdownOpen(false)
    void loadComponents(system.id)
  }

  return (
    <InventoryPageShell
      title="Systems"
      subtitle="Define system configurations and map the spare components required to build each one."
      actions={
        <button
          type="button"
          disabled={!selectedSystem || componentSubmitting}
          onClick={() => setComponentModalOpen(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Component
        </button>
      }
    >

      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 flex min-w-[260px] items-start justify-between gap-3 rounded-lg px-4 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.14)] text-sm ${
            toast.tone === 'success'
              ? 'bg-white text-green-700'
              : 'bg-white text-red-700'
          }`}
        >
          <span>{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} className="mt-0.5 shrink-0 opacity-40 transition-opacity hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Toolbar: controls left, primary action right ─────── */}
      <section className={`${inventorySectionCardClass} mb-4 flex flex-wrap items-center justify-between gap-2`}>
        <div className="flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              disabled={systemsLoading}
              className="flex h-10 w-[220px] items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 hover:bg-slate-50 disabled:opacity-60"
            >
              <span className={selectedSystem ? "truncate font-medium text-slate-800" : "text-slate-400"}>
                {systemsLoading
                  ? "Loading..."
                  : selectedSystem
                    ? `${selectedSystem.system_name} · ${selectedSystem.capacity_kw} kW`
                    : "Select system"}
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 top-full z-30 mt-1 w-[220px] overflow-hidden rounded-lg bg-white shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
                {systems.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-slate-400">No systems yet</div>
                ) : (
                  systems.map((system) => (
                    <button
                      key={system.id}
                      type="button"
                      onClick={() => handleSelectSystem(system)}
                      className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors duration-100 hover:bg-slate-50 ${
                        selectedSystem?.id === system.id ? "bg-blue-50 text-blue-700" : "text-slate-700"
                      }`}
                    >
                      <span className="font-medium">{system.system_name}</span>
                      <span className="text-xs text-slate-400">{system.capacity_kw} kW</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSystemModalOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 transition duration-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <Plus className="h-3.5 w-3.5" />
            New System
          </button>
        </div>
      </section>

      {/* ── Work Area ───────────────────────────────────────────── */}
      {!selectedSystem ? (
        <div className={`${inventorySectionCardClass} flex min-h-[300px] flex-col items-center justify-center gap-3 text-center`}>
          <div>
            <p className="text-sm font-semibold text-slate-600">No system selected</p>
            <p className="mt-1 text-xs text-slate-400">Select a system above or create a new one</p>
          </div>
          <button
            type="button"
            onClick={() => setSystemModalOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition duration-200 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            New System
          </button>
        </div>
      ) : (
        <SystemComponentsTable
          rows={components}
          loading={componentsLoading}
          systemName={selectedSystem.system_name}
          onAddComponent={() => setComponentModalOpen(true)}
          onRemove={async (componentId) => {
            try {
              await removeSystemComponent(componentId)
              setToast({ tone: 'success', text: 'Component removed.' })
              await loadComponents(selectedSystem.id)
            } catch (error) {
              setToast({ tone: 'error', text: error instanceof Error ? error.message : 'Operation failed' })
            }
          }}
        />
      )}

      <CreateSystemModal
        open={systemModalOpen}
        loading={createLoading}
        onClose={() => { if (!createLoading) setSystemModalOpen(false) }}
        onSubmit={async ({ system_name, capacity_kw }) => {
          setCreateLoading(true)
          try {
            const { data } = await createSystem({ system_name, capacity_kw, description: null })
            if (data) {
              const created = data as SystemRow
              setToast({ tone: 'success', text: 'System created successfully.' })
              setSystemModalOpen(false)
              await loadSystems()
              setSelectedSystem(created)
              await loadComponents(created.id)
            }
          } catch (error) {
            setToast({ tone: 'error', text: error instanceof Error ? error.message : 'Operation failed' })
          } finally {
            setCreateLoading(false)
          }
        }}
      />

      <AddComponentModal
        open={componentModalOpen}
        loading={componentSubmitting || componentsLoading}
        spares={spares}
        onClose={() => {
          if (!componentSubmitting) {
            setComponentModalOpen(false)
          }
        }}
        onSubmit={async ({ spare_id, quantity_required }) => {
          if (!selectedSystem) return
          setComponentSubmitting(true)
          try {
            await addSystemComponent({
              system_id: selectedSystem.id,
              spare_id,
              quantity_required
            })
            setToast({ tone: 'success', text: 'Component added successfully.' })
            setComponentModalOpen(false)
            await loadComponents(selectedSystem.id)
          } catch (error) {
            setToast({ tone: 'error', text: error instanceof Error ? error.message : 'Operation failed' })
          } finally {
            setComponentSubmitting(false)
          }
        }}
      />
    </InventoryPageShell>
  )
}
