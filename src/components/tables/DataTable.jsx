"use client"

export default function DataTable({
  columns,
  rows,
  loading,
  emptyLabel = 'No records found',
  rowKey = 'id',
  page = 1,
  pageSize = 10,
  totalCount = 0,
  onPageChange
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-500">
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-500">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row[rowKey] ?? JSON.stringify(row)} className="border-b border-gray-100 transition hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-gray-700">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm">
        <span className="text-gray-500">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPageChange?.(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
