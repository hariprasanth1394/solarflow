"use client"

import { ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

type DropdownItem = {
  label: string
  onClick: () => void
  active?: boolean
}

type DropdownProps = {
  label: string
  items: DropdownItem[]
}

export default function Dropdown({ label, items }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="dropdown-trigger min-w-32"
        aria-expanded={open}
      >
        <span>{label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[color:var(--sf-muted-text)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="dropdown-menu absolute right-0 z-20 mt-2 min-w-40">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
              className={`dropdown-item ${item.active ? "active" : ""}`}
              aria-selected={item.active ? "true" : undefined}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
