"use client"

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Customers', href: '/customers' },
  { label: 'Tasks', href: '/tasks' },
  { label: 'Documents', href: '/documents' },
  { label: 'Inventory', href: '/inventory' },
  { label: 'Reports', href: '/reports' },
  { label: 'Settings', href: '/settings' }
]

export default function SaaSLayout({ title, description, actions, children, showSidebar = true }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/assets/solarflow-logo-dark.svg" alt="Solar Flow" width={156} height={38} priority className="h-9 w-36 object-contain" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Supabase powered operations platform</p>
            </div>
          </div>
          <Link href="/login" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700">
            Login
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {showSidebar && (
          <aside className="hidden w-56 shrink-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm md:block">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-lg px-3 py-2 text-sm transition ${
                      isActive
                        ? 'bg-violet-50 font-semibold text-violet-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </aside>
        )}

        <main className="min-w-0 flex-1 space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
                {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
              </div>
              {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
            </div>
          </section>

          {children}
        </main>
      </div>
    </div>
  )
}
