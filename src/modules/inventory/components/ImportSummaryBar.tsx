"use client"

type ImportSummaryBarProps = {
  totalRows: number
  newRows: number
  updatedRows: number
  unchangedRows: number
  errorRows: number
}

export default function ImportSummaryBar({
  totalRows,
  newRows,
  updatedRows,
  unchangedRows,
  errorRows
}: ImportSummaryBarProps) {
  const items = [
    { key: "total", label: "Rows", value: totalRows, highlight: false },
    { key: "new", label: "New", value: newRows, highlight: newRows > 0 },
    { key: "update", label: "Updated", value: updatedRows, highlight: updatedRows > 0 },
    { key: "unchanged", label: "Unchanged", value: unchangedRows, highlight: false },
    { key: "error", label: "Errors", value: errorRows, highlight: errorRows > 0, isError: true }
  ]

  return (
    <div className="inv-import-summary-bar" role="list" aria-label="Import summary">
      {items.map((item) => (
        <div
          key={item.key}
          className={`inv-import-summary-item ${item.highlight ? "inv-import-summary-item--highlight" : ""} ${item.isError && item.value > 0 ? "inv-import-summary-item--error" : ""}`}
          role="listitem"
        >
          <span className="inv-import-summary-value">{item.value}</span>
          <span className="inv-import-summary-label">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
