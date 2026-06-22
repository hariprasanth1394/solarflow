export const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "TECHNICIAN",
  "VIEWER",
] as const

export type UserRole = (typeof USER_ROLES)[number]

export const USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"] as const

export type UserStatus = (typeof USER_STATUSES)[number]

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard:view",
  CUSTOMERS_VIEW: "customers:view",
  CUSTOMERS_MANAGE: "customers:manage",
  INVENTORY_VIEW: "inventory:view",
  INVENTORY_MANAGE: "inventory:manage",
  DOCUMENTS_VIEW: "documents:view",
  DOCUMENTS_MANAGE: "documents:manage",
  TASKS_VIEW: "tasks:view",
  TASKS_MANAGE: "tasks:manage",
  REPORTS_VIEW: "reports:view",
  ANALYTICS_VIEW: "analytics:view",
  SETTINGS_VIEW: "settings:view",
  SETTINGS_MANAGE: "settings:manage",
  USERS_MANAGE: "users:manage",
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  ADMIN: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_MANAGE,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
  ],
  MANAGER: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_MANAGE,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_MANAGE,
  ],
  TECHNICIAN: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE],
  VIEWER: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
}

export const ROUTE_PERMISSIONS: Record<string, PermissionKey> = {
  "/dashboard": PERMISSIONS.DASHBOARD_VIEW,
  "/customers": PERMISSIONS.CUSTOMERS_VIEW,
  "/inventory": PERMISSIONS.INVENTORY_VIEW,
  "/documents": PERMISSIONS.DOCUMENTS_VIEW,
  "/tasks": PERMISSIONS.TASKS_VIEW,
  "/reports": PERMISSIONS.REPORTS_VIEW,
  "/analytics": PERMISSIONS.ANALYTICS_VIEW,
  "/settings": PERMISSIONS.SETTINGS_VIEW,
}

export function normalizeRole(value: string | null | undefined): UserRole | null {
  const normalized = (value ?? "").toUpperCase().trim()
  if (USER_ROLES.includes(normalized as UserRole)) return normalized as UserRole
  if (normalized === "EMPLOYEE" || normalized === "MEMBER") return "TECHNICIAN"
  if (normalized === "OWNER") return "SUPER_ADMIN"
  if (normalized === "ADMIN") return "ADMIN"
  return null
}

export function roleHasPermission(role: UserRole, permission: PermissionKey, customPermissions: PermissionKey[] = []) {
  if (customPermissions.includes(permission)) return true
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function canAccessRoute(role: UserRole, pathname: string, customPermissions: PermissionKey[] = []) {
  const match = Object.entries(ROUTE_PERMISSIONS).find(([route]) => pathname === route || pathname.startsWith(`${route}/`))
  if (!match) return true
  return roleHasPermission(role, match[1], customPermissions)
}

export function getProvisionBlockMessage(reason: string | null | undefined) {
  switch (reason) {
    case "NOT_PROVISIONED":
      return "Your account has not been provisioned. Please contact your administrator."
    case "STATUS_INACTIVE":
      return "Your account is inactive. Please contact your administrator."
    case "STATUS_SUSPENDED":
      return "Your account has been suspended. Please contact your administrator."
    case "STATUS_PENDING":
      return "Your account is pending activation. Please contact your administrator."
    case "NOT_AUTHENTICATED":
      return "Authentication required. Please sign in again."
    default:
      if (reason?.startsWith("STATUS_")) {
        return "Your account cannot access SolarFlow right now. Please contact your administrator."
      }
      return "Access denied. Please contact your administrator."
  }
}
