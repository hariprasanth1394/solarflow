"use client"

import { useState } from "react"
import { cn } from "../../lib/utils"

type TabItem = {
  key: string
  label: string
  content: React.ReactNode
}

export default function Tabs({ items }: { items: TabItem[] }) {
  const [active, setActive] = useState(items[0]?.key)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActive(item.key)}
            className={cn("rounded-xl px-3 py-2 text-sm", active === item.key ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700")}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div>{items.find((item) => item.key === active)?.content}</div>
    </div>
  )
}
