"use client"

import { useMemo, useState } from "react"
import LoadingButton from "../../components/ui/LoadingButton"

type User = { id: string; name: string | null; email: string | null }

type AddTaskModalProps = {
  open: boolean
  loading: boolean
  users: User[]
  onClose: () => void
  onSubmit: (payload: {
    title: string
    description: string | null
    priority: string
    assigned_to: string | null
    due_date: string | null
    status: string
  }) => Promise<void>
}

export default function AddTaskModal({ open, loading, users, onClose, onSubmit }: AddTaskModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("Medium")
  const [assignedTo, setAssignedTo] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [status, setStatus] = useState("Pending")

  const disabled = useMemo(() => !title.trim() || loading, [title, loading])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            await onSubmit({
              title: title.trim(),
              description: description || null,
              priority,
              assigned_to: assignedTo || null,
              due_date: dueDate ? new Date(dueDate).toISOString() : null,
              status
            })
            setTitle("")
            setDescription("")
            setPriority("Medium")
            setAssignedTo("")
            setDueDate("")
            setStatus("Pending")
          }}
          className="my-6 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:p-5"
        >
          <h3 className="text-lg font-semibold text-gray-900">Add Task</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
              required
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
              rows={3}
            />
            <select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
            <select
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Assign user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email || user.id}
                </option>
              ))}
            </select>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm sm:w-auto">
              Cancel
            </button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingLabel="Saving..."
              disabled={disabled}
              className="w-full bg-violet-600 text-white sm:w-auto"
            >
              Create Task
            </LoadingButton>
          </div>
        </form>
      </div>
    </>
  )
}
