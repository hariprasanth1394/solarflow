"use client"

import { BarChart3, ChevronLeft, ClipboardList, FileText, LayoutDashboard, Settings, Users, Warehouse, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"

type SidebarProps = {
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

const navSections = [
  {
    id: "core",
    title: "Core",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Inventory", href: "/inventory", icon: Warehouse },
      { label: "Documents", href: "/documents", icon: FileText }
    ]
  },
  {
    id: "ops",
    title: "Operations",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Reports", href: "/reports", icon: BarChart3 },
      { label: "Tasks", href: "/tasks", icon: ClipboardList },
      { label: "Settings", href: "/settings", icon: Settings }
    ]
  }
]

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ core: true, ops: true })

  const desktopWidth = useMemo(() => (collapsed ? "w-20" : "w-64"), [collapsed])
  const showLabels = mobileOpen || !collapsed

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

        <nav className="flex-1 space-y-3 overflow-y-auto scroll-smooth p-3 pb-8">
          {navSections.map((section) => (
            <div key={section.id} className="space-y-1">
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => setOpenSections((prev) => ({ ...prev, [section.id]: !prev[section.id] }))}
                  className="w-full rounded-lg px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hover:bg-slate-800"
                >
                  {section.title}
                </button>
              ) : null}

              {(collapsed || openSections[section.id]) &&
                section.items.map(({ label, href, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`)
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onCloseMobile}
                      className={`flex items-center rounded-xl px-3 py-2 text-sm transition-colors ${showLabels ? "gap-3" : "justify-center"} ${active ? "bg-violet-600/20 text-violet-200" : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"}`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      {showLabels ? <span>{label}</span> : null}
                    </Link>
                  )
                })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}