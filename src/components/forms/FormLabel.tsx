import type { ReactNode } from "react"

export default function FormLabel({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700">{children}</label>
}
