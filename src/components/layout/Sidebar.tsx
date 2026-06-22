"use client"

import { BarChart3, ChevronLeft, ClipboardList, FileText, LayoutDashboard, Settings, Users, Warehouse, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"
import { useAuthContext } from "@/contexts/AuthContext"
import { PERMISSIONS } from "@/lib/rbac/roles"

type SidebarProps = {
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

type NavItem = {
  label: string
  href: string
  icon: typeof LayoutDashboard
  permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
}

const navSections: Array<{ id: string; title: string; items: NavItem[] }> = [
  {
    id: "core",
    title: "Core",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_VIEW },
      { label: "Customers", href: "/customers", icon: Users, permission: PERMISSIONS.CUSTOMERS_VIEW },
      { label: "Inventory", href: "/inventory", icon: Warehouse, permission: PERMISSIONS.INVENTORY_VIEW },
      { label: "Documents", href: "/documents", icon: FileText, permission: PERMISSIONS.DOCUMENTS_VIEW },
    ],
  },
  {
    id: "ops",
    title: "Operations",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3, permission: PERMISSIONS.ANALYTICS_VIEW },
      { label: "Reports", href: "/reports", icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW },
      { label: "Tasks", href: "/tasks", icon: ClipboardList, permission: PERMISSIONS.TASKS_VIEW },
      { label: "Settings", href: "/settings", icon: Settings, permission: PERMISSIONS.SETTINGS_VIEW },
    ],
  },
]

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const { hasPermission } = useAuthContext()
  const [collapsed, setCollapsed] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ core: true, ops: true })

  const desktopWidth = useMemo(() => (collapsed ? "w-20" : "w-64"), [collapsed])
  const showLabels = mobileOpen || !collapsed

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasPermission(item.permission)),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <>
      {mobileOpen ? <button aria-label="Close sidebar" className="sf-layer-sidebar-backdrop fixed inset-0 bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={onCloseMobile} /> : null}

      <aside
        data-sidebar="true"
        className={`sf-mobile-drawer sf-layer-sidebar fixed inset-0 left-0 flex h-[100dvh] w-full flex-col border-r transition-transform duration-300 ease-out lg:static lg:h-screen lg:w-auto lg:translate-x-0 ${desktopWidth} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ backgroundColor: "var(--sf-sidebar-bg)", borderColor: "var(--sf-sidebar-border)", color: "var(--sf-sidebar-text)" }}
      >
        <div className="flex items-center justify-between border-b px-4 py-3.5" style={{ borderColor: "var(--sf-sidebar-border)" }}>
          <div className="flex min-w-0 flex-1 items-center pr-2">
            <div className={`flex h-8 w-full items-center transition-all duration-300 ${collapsed ? "justify-center" : "justify-start"}`}>
              {collapsed ? (
                <Image src="/assets/solarflow-app-icon.svg" alt="Solar Flow" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" priority />
              ) : (
                <Image src="/assets/solarflow-logo-dark.svg" alt="Solar Flow" width={164} height={40} className="h-10 w-40 shrink-0 object-contain" priority />
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="hidden rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 lg:inline-flex"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibleSections.map((section) => (
            <div key={section.id} className="mb-4">
              {showLabels ? (
                <button
                  type="button"
                  onClick={() => setOpenSections((prev) => ({ ...prev, [section.id]: !prev[section.id] }))}
                  className="mb-2 flex w-full items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                >
                  {section.title}
                </button>
              ) : null}
              {(showLabels ? openSections[section.id] : true) ? (
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onCloseMobile}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                          active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                        } ${collapsed && !mobileOpen ? "justify-center" : ""}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {showLabels ? <span>{item.label}</span> : null}
                      </Link>
                    )
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
