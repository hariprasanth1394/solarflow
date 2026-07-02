"use client"

import { Layers, Zap } from "lucide-react"

export type SystemCarouselItem = {
  id: string
  system_name: string
  capacity_kw: number
  componentCount: number
  totalUnits: number
}

type SystemCardCarouselProps = {
  systems: SystemCarouselItem[]
  selectedId: string | null
  loading?: boolean
  onSelect: (id: string) => void
}

export default function SystemCardCarousel({
  systems,
  selectedId,
  loading = false,
  onSelect,
}: SystemCardCarouselProps) {
  if (loading) {
    return (
      <div className="inv-system-carousel">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="inv-system-carousel-card inv-skeleton-card" aria-hidden="true" />
        ))}
      </div>
    )
  }

  if (systems.length === 0) {
    return (
      <div className="inv-system-carousel-empty inv-elevated-card">
        <p className="inv-systems-empty-title">No systems yet</p>
        <p className="inv-systems-empty-text">Create your first system configuration to start building.</p>
      </div>
    )
  }

  return (
    <div className="inv-system-carousel" role="listbox" aria-label="System configurations">
      {systems.map((system) => {
        const active = system.id === selectedId
        return (
          <button
            key={system.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onSelect(system.id)}
            className={`inv-system-carousel-card ${active ? "inv-system-carousel-card--active" : ""}`}
          >
            <div className="inv-system-carousel-card-head">
              <span className="inv-system-carousel-card-icon" aria-hidden="true">
                <Zap className="h-4 w-4" />
              </span>
              <span className="inv-system-carousel-card-title">{system.system_name}</span>
            </div>
            <div className="inv-system-carousel-card-stats">
              <span className="inv-stat-pill inv-stat-pill--blue">
                <Zap className="h-3 w-3" />
                {system.capacity_kw} kW
              </span>
              <span className="inv-stat-pill inv-stat-pill--accent">
                <Layers className="h-3 w-3" />
                {system.componentCount} {system.componentCount === 1 ? "Component" : "Components"}
              </span>
              <span className="inv-stat-pill">
                {system.totalUnits} Units Required
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
