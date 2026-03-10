"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import AddComponentModal from "./AddComponentModal"
import SystemComponentsTable from "./SystemComponentsTable"
import {
  addSystemComponent,
  createSystem,
  getSparesForSystemBuilder,
  getSystemComponents,
  getSystems,
  removeSystemComponent
} from "../../../services/systemService"
import LoadingButton from "../../../components/ui/LoadingButton"

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
  const [loading, setLoading] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [componentSubmitting, setComponentSubmitting] = useState(false)
  const [componentModalOpen, setComponentModalOpen] = useState(false)
  const [systemName, setSystemName] = useState("")
  const [capacityKw, setCapacityKw] = useState("")
  const [message, setMessage] = useState("")

  const loadSystems = useCallback(async () => {
    setLoading(true)
    const { data } = await getSystems()
    setSystems(data as SystemRow[])
    setLoading(false)
  }, [])

  const loadSpares = useCallback(async () => {
    const { data } = await getSparesForSystemBuilder()
    setSpares(data as SpareOption[])
  }, [])

  const loadComponents = useCallback(async (systemId: string) => {
    setLoading(true)
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
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true

    void (async () => {
      await Promise.all([loadSystems(), loadSpares()])
      if (!active) {
        return
      }
    })()

    return () => {
      active = false
    }
  }, [loadSystems, loadSpares])

  const selectedTitle = useMemo(() => selectedSystem?.system_name ?? "Select a system", [selectedSystem])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Create Solar System</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={systemName}
            onChange={(event) => setSystemName(event.target.value)}
            placeholder="System name (e.g. 15kW Solar System)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            value={capacityKw}
            onChange={(event) => setCapacityKw(event.target.value)}
            placeholder="Capacity kW"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <LoadingButton
            type="button"
            loading={createLoading}
            loadingLabel="Creating..."
            disabled={!systemName.trim() || !capacityKw || createLoading}
            onClick={async () => {
              setCreateLoading(true)
              try {
                const { data } = await createSystem({
                  system_name: systemName.trim(),
                  capacity_kw: Number(capacityKw),
                  description: null
                })
                if (data) {
                  setMessage("System created successfully")
                  setSystemName("")
                  setCapacityKw("")
                  await loadSystems()
                }
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Operation failed")
              } finally {
                setCreateLoading(false)
              }
            }}
            className="w-full bg-violet-600 text-white md:w-auto"
          >
            Create System
          </LoadingButton>
        </div>
      </div>

      {message ? <p className="text-sm text-gray-600">{message}</p> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">Systems</h3>
          <div className="mt-3 space-y-2">
            {systems.length === 0 ? (
              <p className="text-sm text-gray-500">No systems yet.</p>
            ) : (
              systems.map((system) => (
                <button
                  key={system.id}
                  type="button"
                  onClick={async () => {
                    setSelectedSystem(system)
                    await loadComponents(system.id)
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedSystem?.id === system.id ? "border-violet-300 bg-violet-50" : "border-gray-200"
                  }`}
                >
                  <div className="font-medium text-gray-900">{system.system_name}</div>
                  <div className="text-xs text-gray-500">{system.capacity_kw} kW</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Components</h3>
              <p className="text-sm text-gray-500">{selectedTitle}</p>
            </div>
            <button
              type="button"
              disabled={!selectedSystem || componentSubmitting}
              onClick={() => setComponentModalOpen(true)}
              className="w-full rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 sm:w-auto"
            >
              Add Component
            </button>
          </div>

          <SystemComponentsTable
            rows={components}
            loading={loading}
            onRemove={async (componentId) => {
              if (!selectedSystem) return
              try {
                await removeSystemComponent(componentId)
                setMessage("Component removed successfully")
                await loadComponents(selectedSystem.id)
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Operation failed")
              }
            }}
          />
        </div>
      </div>

      <AddComponentModal
        open={componentModalOpen}
        loading={componentSubmitting || loading}
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
            setMessage("Component added successfully")
            setComponentModalOpen(false)
            await loadComponents(selectedSystem.id)
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Operation failed")
          } finally {
            setComponentSubmitting(false)
          }
        }}
      />
    </div>
  )
}
