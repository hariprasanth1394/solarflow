"use client"

export default function SearchFilterBar({
  search,
  onSearchChange,
  placeholder = 'Search...',
  filters,
  actions
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-violet-400"
          />
          {filters}
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </div>
  )
}
