import type { ReactNode } from "react"

type TableProps = {
  headers: string[]
  children: ReactNode
}

export default function Table({ headers, children }: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  )
}