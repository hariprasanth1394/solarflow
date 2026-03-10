"use client"

import { useCallback, useEffect, useState } from "react"
import SearchFilterBar from "../../components/forms/SearchFilterBar"
import AddTaskModal from "./AddTaskModal"
import TaskTable from "./TaskTable"
import { createTask, deleteTask, getAssignableTaskUsers, getTasks, updateTask } from "../../services/taskService"

type TaskRow = {
  id: string
  title: string
  description: string | null
  priority: string
  assigned_to: string | null
  due_date: string | null
  status: string
}

type User = { id: string; name: string | null; email: string | null }

const pageSize = 10

function nextStatus(current: string) {
  if (current === "Pending") return "In Progress"
  if (current === "In Progress") return "Completed"
  if (current === "Completed") return "Cancelled"
  return "Pending"
}

export default function TasksPage() {
  const [rows, setRows] = useState<TaskRow[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const actionInProgress = Boolean(saving || deletingId || updatingId)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setErrorMessage("")
    try {
      const { data, count } = await getTasks({ search, page, pageSize, status: statusFilter })
      setRows((data ?? []) as TaskRow[])
      setTotalCount(count ?? 0)
    } catch (error) {
      setRows([])
      setTotalCount(0)
      setErrorMessage(error instanceof Error ? error.message : "Operation failed")
    } finally {
      setLoading(false)
    }
  }, [search, page, statusFilter])

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await getAssignableTaskUsers()
      setUsers((data ?? []) as User[])
    } catch {
      setUsers([])
    }
  }, [])

  useEffect(() => {
    let active = true

    void (async () => {
      await fetchTasks()
      if (!active) {
        return
      }
    })()

    return () => {
      active = false
    }
  }, [fetchTasks])

  useEffect(() => {
    let active = true

    void (async () => {
      await fetchUsers()
      if (!active) {
        return
      }
    })()

    return () => {
      active = false
    }
  }, [fetchUsers])

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900">Tasks</h2>
        <p className="mt-1 text-sm text-gray-600">Create, assign and track task delivery.</p>
      </section>

      <SearchFilterBar
        search={search}
        onSearchChange={(value: string) => {
          setSearch(value)
          setPage(1)
        }}
        placeholder="Search title, description or assignee"
        filters={
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option>All</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
        }
        actions={
          <button
            type="button"
            disabled={actionInProgress}
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Add Task
          </button>
        }
      />

      {errorMessage ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}

      <TaskTable
        rows={rows}
        loading={loading}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        onAdvanceStatus={async (task) => {
          if (actionInProgress) return
          setUpdatingId(task.id)
          setErrorMessage("")
          try {
            await updateTask(task.id, { status: nextStatus(task.status) })
            await fetchTasks()
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Operation failed")
          } finally {
            setUpdatingId(null)
          }
        }}
        onDelete={async (id) => {
          if (actionInProgress) return
          setDeletingId(id)
          setErrorMessage("")
          try {
            await deleteTask(id)
            await fetchTasks()
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Operation failed")
          } finally {
            setDeletingId(null)
          }
        }}
      />

      <AddTaskModal
        open={modalOpen}
        loading={saving}
        users={users}
        onClose={() => {
          if (!saving) {
            setModalOpen(false)
          }
        }}
        onSubmit={async (payload) => {
          setSaving(true)
          setErrorMessage("")
          try {
            await createTask(payload)
            setModalOpen(false)
            await fetchTasks()
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Operation failed")
          } finally {
            setSaving(false)
          }
        }}
      />
    </div>
  )
}
