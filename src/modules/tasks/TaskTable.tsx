"use client"

import { memo, useMemo } from "react"
import DataTable from "../../components/tables/DataTable"
import { formatDateUTC } from "../../utils/dateFormat"

type TaskRow = {
  id: string
  title: string
  description: string | null
  priority: string
  assigned_to: string | null
  due_date: string | null
  status: string
}

type TaskTableProps = {
  rows: TaskRow[]
  loading: boolean
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onAdvanceStatus: (task: TaskRow) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const statusTone: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-red-100 text-red-700"
}

function TaskTable({ rows, loading, page, pageSize, totalCount, onPageChange, onAdvanceStatus, onDelete }: TaskTableProps) {
  const columns = useMemo(
    () => [
      { key: "title", header: "Title" },
      { key: "description", header: "Description" },
      { key: "priority", header: "Priority" },
      { key: "assigned_to", header: "Assigned User" },
      {
        key: "due_date",
        header: "Due Date",
        render: (row: TaskRow) => formatDateUTC(row.due_date)
      },
      {
        key: "status",
        header: "Status",
        render: (row: TaskRow) => (
          <span className={`rounded-lg px-2 py-1 text-xs font-medium ${statusTone[row.status] ?? "bg-gray-100 text-gray-700"}`}>
            {row.status}
          </span>
        )
      },
      {
        key: "actions",
        header: "Actions",
        render: (row: TaskRow) => (
          <div className="flex gap-2">
            <button type="button" onClick={() => void onAdvanceStatus(row)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs">
              Update
            </button>
            <button
              type="button"
              onClick={() => void onDelete(row.id)}
              className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600"
            >
              Delete
            </button>
          </div>
        )
      }
    ],
    [onAdvanceStatus, onDelete]
  )

  return (
    <DataTable
      columns={columns}
      rows={rows}
      loading={loading}
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={onPageChange}
      emptyLabel="No tasks found"
    />
  )
}

export default memo(TaskTable)
