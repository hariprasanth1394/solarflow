"use client"

import { LayersPlus, Search } from "lucide-react"
import InventoryToolbarSelect from "./InventoryToolbarSelect"
import type { SystemCarouselItem } from "./SystemCardCarousel"

type CapacityFilter = "all" | "small" | "medium" | "large"

type SystemListPanelProps = {
  systems: SystemCarouselItem[]
  selectedId: string | null
  loading?: boolean
  search: string
  capacityFilter: CapacityFilter
  onSearchChange: (value: string) => void
  onCapacityFilterChange: (value: CapacityFilter) => void
  onSelect: (id: string) => void
  onCreateSystem: () => void
}

const capacityFilters: { key: CapacityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "small", label: "< 10 kW" },
  { key: "medium", label: "10–25 kW" },
  { key: "large", label: "> 25 kW" },
]

function matchesCapacity(capacity: number, filter: CapacityFilter) {
  if (filter === "all") return true
  if (filter === "small") return capacity < 10
  if (filter === "medium") return capacity >= 10 && capacity <= 25
  return capacity > 25
}

export default function SystemListPanel({
  systems,
  selectedId,
  loading = false,
  search,
  capacityFilter,
  onSearchChange,
  onCapacityFilterChange,
  onSelect,
  onCreateSystem,
}: SystemListPanelProps) {
  const normalizedSearch = search.trim().toLowerCase()
  const filtered = systems.filter((system) => {
    if (!matchesCapacity(system.capacity_kw, capacityFilter)) return false
    if (!normalizedSearch) return true
    return system.system_name.toLowerCase().includes(normalizedSearch)
  })

  return (
    <aside className="inv-master-panel inv-master-panel--mobile-browse">
      <div className="inv-master-panel-sticky">
        <button
          type="button"
          onClick={onCreateSystem}
          className="inv-spares-add-btn inv-systems-add-btn"
        >
          <span className="inv-spares-add-btn-icon inv-action-btn-icon" aria-hidden="true">
            <LayersPlus className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="inv-spares-add-btn-label">New System</span>
        </button>

        <div className="inv-master-panel-search">
          <Search className="h-4 w-4 shrink-0 text-[var(--inv-secondary)]" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search systems..."
            className="inv-master-panel-search-input"
            aria-label="Search systems"
          />
        </div>

        <div className="inv-filter-chips inv-systems-filter-chips" role="tablist" aria-label="Capacity filters">
          {capacityFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              role="tab"
              aria-selected={capacityFilter === filter.key}
              onClick={() => onCapacityFilterChange(filter.key)}
              className={`inv-filter-chip ${capacityFilter === filter.key ? "inv-filter-chip--active" : ""}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="inv-systems-capacity-select">
          <InventoryToolbarSelect
            inputId="systems-capacity-filter"
            className="inv-systems-capacity-select-control"
            ariaLabel="Filter systems by capacity"
            placeholder="All capacities"
            value={capacityFilter}
            options={capacityFilters.map((filter) => ({
              label: filter.label,
              value: filter.key,
            }))}
            isSearchable={false}
            onChange={(value) => onCapacityFilterChange(value as CapacityFilter)}
          />
        </div>
      </div>

      <div className="inv-master-list" role="listbox" aria-label="Systems">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="inv-master-list-item inv-skeleton-card" aria-hidden="true" />
          ))
        ) : filtered.length === 0 ? (
          <p className="inv-master-list-empty">No systems match.</p>
        ) : (
          filtered.map((system) => {
            const active = system.id === selectedId
            return (
              <button
                key={system.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onSelect(system.id)}
                className={`inv-master-list-item ${active ? "inv-master-list-item--active" : ""}`}
              >
                <div className="inv-master-list-item-copy">
                  <span className="inv-master-list-item-title">{system.system_name}</span>
                  <span className="inv-master-list-item-meta">
                    {system.capacity_kw} kW · {system.componentCount} components
                  </span>
                </div>
                <span className="inv-master-list-item-qty">{system.totalUnits} units</span>
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}
