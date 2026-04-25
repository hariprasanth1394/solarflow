"use client"

import { Search } from "lucide-react"

export default function SearchFilterBar({
  search,
  onSearchChange,
  placeholder = 'Search...',
  filters,
  actions
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="search-input-wrapper min-w-[220px] flex-1">
            <Search className="search-input-icon" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={placeholder}
              className="search-input"
            />
          </div>
          {filters}
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </div>
  )
}
