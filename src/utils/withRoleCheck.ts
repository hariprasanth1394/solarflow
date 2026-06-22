import { getRequestContext } from "../lib/orgContext"
import { roleHasPermission, type PermissionKey, type UserRole } from "../lib/rbac/roles"

const ROLE_RANK: Record<UserRole, number> = {
  VIEWER: 1,
  TECHNICIAN: 2,
  MANAGER: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
}

export async function withRequestContext<T>(
  handler: (context: Awaited<ReturnType<typeof getRequestContext>>) => Promise<T>
): Promise<T> {
  const context = await getRequestContext()
  return handler(context)
}

export async function withRoleCheck<T>(
  minimumRole: UserRole,
  handler: (context: Awaited<ReturnType<typeof getRequestContext>>) => Promise<T>
): Promise<T> {
  const context = await getRequestContext()
  if (ROLE_RANK[context.role] < ROLE_RANK[minimumRole]) {
    throw new Error("You do not have permission to perform this action.")
  }
  return handler(context)
}

export async function withPermissionCheck<T>(
  permission: PermissionKey,
  handler: (context: Awaited<ReturnType<typeof getRequestContext>>) => Promise<T>
): Promise<T> {
  const context = await getRequestContext()
  if (!roleHasPermission(context.role, permission)) {
    throw new Error("You do not have permission to perform this action.")
  }
  return handler(context)
}
