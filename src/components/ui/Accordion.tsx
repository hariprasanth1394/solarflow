"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"

type AccordionItem = {
  id: string
  title: string
  content: React.ReactNode
}

export default function Accordion({ items }: { items: AccordionItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null)

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const open = openId === item.id
        return (
          <div key={item.id} className="rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : item.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
            >
              {item.title}
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open ? <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600">{item.content}</div> : null}
          </div>
        )
      })}
    </div>
  )
}
