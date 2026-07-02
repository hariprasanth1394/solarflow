"use client"

import RoleGate from "@/components/auth/RoleGate"
import ModulePageHeader from "@/components/layout/ModulePageHeader"
import { listManagedUsers, type ManagedUser } from "@/services/userService"
import { Users } from "lucide-react"
import { useEffect, useState } from "react"

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    void listManagedUsers()
      .then(setUsers)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load users"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <RoleGate minimumRole="SUPER_ADMIN" fallback={<p className="text-sm text-slate-500">Only Super Admins can manage users.</p>}>
      <div className="space-y-5">
        <ModulePageHeader title="User Management" icon={Users} />

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-[var(--sf-muted-text)]">Loading users…</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--sf-card-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[color-mix(in_srgb,var(--sf-card-bg)_92%,var(--hover))] text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Linked</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-[var(--sf-card-border)]">
                    <td className="px-4 py-3">{user.fullName ?? "—"}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.role}</td>
                    <td className="px-4 py-3">{user.status}</td>
                    <td className="px-4 py-3">{user.authUserId ? "Yes" : "Pending link"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RoleGate>
  )
}
