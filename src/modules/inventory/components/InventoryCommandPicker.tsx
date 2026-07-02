"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Search } from "lucide-react"

export type CommandPickerOption = {
  id: string
  label: string
  meta?: string
}

type InventoryCommandPickerProps = {
  options: CommandPickerOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  emptyLabel?: string
  disabled?: boolean
}

export default function InventoryCommandPicker({
  options,
  value,
  onChange,
  placeholder = "Search component...",
  emptyLabel = "No components found",
  disabled = false,
}: InventoryCommandPickerProps) {
  const [query, setQuery] = useState("")
  const [highlightIndex, setHighlightIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return options
    return options.filter((option) => {
      const haystack = `${option.label} ${option.meta ?? ""}`.toLowerCase()
      return haystack.includes(normalized)
    })
  }, [options, query])

  useEffect(() => {
    setHighlightIndex(0)
  }, [query, filtered.length])

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlightIndex}"]`)
    node?.scrollIntoView({ block: "nearest" })
  }, [highlightIndex])

  const selectAt = (index: number) => {
    const option = filtered[index]
    if (!option) return
    onChange(option.id)
    setQuery("")
  }

  return (
    <div className={`inv-command-picker ${disabled ? "inv-command-picker--disabled" : ""}`}>
      <div className="inv-command-picker-search">
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1))
            }
            if (event.key === "ArrowUp") {
              event.preventDefault()
              setHighlightIndex((prev) => Math.max(prev - 1, 0))
            }
            if (event.key === "Enter" && filtered.length) {
              event.preventDefault()
              selectAt(highlightIndex)
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="inv-command-picker-input"
          autoComplete="off"
        />
      </div>

      <div ref={listRef} className="inv-command-picker-list" role="listbox">
        {filtered.length === 0 ? (
          <p className="inv-command-picker-empty">{emptyLabel}</p>
        ) : (
          filtered.map((option, index) => {
            const selected = option.id === value
            const highlighted = index === highlightIndex
            return (
              <button
                key={option.id}
                type="button"
                data-index={index}
                role="option"
                aria-selected={selected}
                className={`inv-command-picker-item ${selected ? "inv-command-picker-item--selected" : ""} ${
                  highlighted ? "inv-command-picker-item--highlighted" : ""
                }`}
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => selectAt(index)}
              >
                <span className="inv-command-picker-item-label">{option.label}</span>
                {option.meta ? <span className="inv-command-picker-item-meta">{option.meta}</span> : null}
                {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
