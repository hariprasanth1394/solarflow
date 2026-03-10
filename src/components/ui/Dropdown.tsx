"use client"

import { useState } from "react"

type DropdownItem = {
  label: string
  onClick: () => void
}

type DropdownProps = {
  label: string
  items: DropdownItem[]
}

export default function Dropdown({ label, items }: DropdownProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
        {label}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 min-w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-md">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
