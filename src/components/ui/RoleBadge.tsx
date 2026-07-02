import type { UserRole } from "@/lib/rbac/roles"
import { getRoleBadgeLabel } from "@/components/ui/Avatar"

type RoleBadgeProps = {
  role: UserRole
  className?: string
}

export default function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--primary-end)_28%,var(--border))] bg-[color-mix(in_srgb,var(--primary-end)_12%,var(--surface-strong))] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.04em] text-[color-mix(in_srgb,var(--primary-end)_82%,var(--text))] ${className}`}
    >
      {getRoleBadgeLabel(role)}
    </span>
  )
}
