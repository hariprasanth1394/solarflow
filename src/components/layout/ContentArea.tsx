import type { ReactNode } from "react"

export default function ContentArea({ children }: { children: ReactNode }) {
  return <div className="space-y-4 md:space-y-6">{children}</div>
}
