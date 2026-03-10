type PaginationProps = {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-xl border border-slate-300 px-3 py-2 disabled:opacity-50">
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded-xl border border-slate-300 px-3 py-2 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  )
}
