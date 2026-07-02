"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { Check, ChevronDown } from "lucide-react"

export type InventorySubNavItem = {
  key: string
  label: string
  icon: LucideIcon
}

type InventorySubNavProps = {
  tabs: InventorySubNavItem[]
  activeKey: string
  onTabClick: (key: string) => void
}

export default function InventorySubNav({ tabs, activeKey, onTabClick }: InventorySubNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileRootRef = useRef<HTMLDivElement | null>(null)

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.key === activeKey) ?? tabs[0],
    [activeKey, tabs]
  )

  useEffect(() => {
    if (!mobileOpen) return

    function handleOutsideClick(event: MouseEvent) {
      if (!mobileRootRef.current?.contains(event.target as Node)) {
        setMobileOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [mobileOpen])

  const ActiveIcon = activeTab.icon

  return (
    <div className="inv-subnav-wrap">
      <nav className="inv-subnav inv-subnav--desktop" aria-label="Inventory sections">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeKey === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabClick(tab.key)}
              className={`inv-subnav-tab ${isActive ? "inv-subnav-tab--active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="inv-subnav-tab-icon" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      <div ref={mobileRootRef} className="inv-subnav-mobile">
        <button
          type="button"
          className={`inv-subnav-mobile-trigger ${mobileOpen ? "inv-subnav-mobile-trigger--open" : ""}`}
          aria-expanded={mobileOpen}
          aria-haspopup="listbox"
          aria-label="Choose inventory section"
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span className="inv-subnav-mobile-trigger-main">
            <span className="inv-subnav-mobile-trigger-icon" aria-hidden="true">
              <ActiveIcon className="h-4 w-4" />
            </span>
            <span className="inv-subnav-mobile-trigger-copy">
              <span className="inv-subnav-mobile-trigger-label">Section</span>
              <span className="inv-subnav-mobile-trigger-value">{activeTab.label}</span>
            </span>
          </span>
          <ChevronDown className="inv-subnav-mobile-trigger-chevron" aria-hidden="true" />
        </button>

        {mobileOpen ? (
          <div className="inv-subnav-mobile-menu" role="listbox" aria-label="Inventory sections">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeKey === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`inv-subnav-mobile-option ${isActive ? "inv-subnav-mobile-option--active" : ""}`}
                  onClick={() => {
                    onTabClick(tab.key)
                    setMobileOpen(false)
                  }}
                >
                  <span className="inv-subnav-mobile-option-icon" aria-hidden="true">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="inv-subnav-mobile-option-label">{tab.label}</span>
                  {isActive ? <Check className="inv-subnav-mobile-option-check" aria-hidden="true" /> : null}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
