"use client"

import { useEffect, useState } from "react"
import type { RefObject } from "react"

export type ResponsiveValidationResult = {
  hasHorizontalOverflow: boolean
  tableScrollable: boolean
  cardsWrapped: boolean
  sidebarCollapsed: boolean
}

export function validateResponsiveLayout(container: HTMLElement | null): ResponsiveValidationResult {
  if (!container) {
    return {
      hasHorizontalOverflow: false,
      tableScrollable: true,
      cardsWrapped: true,
      sidebarCollapsed: true
    }
  }

  const tables = Array.from(container.querySelectorAll("[data-responsive-table='true']"))
  const cards = Array.from(container.querySelectorAll("[data-responsive-cards='true'] > *"))
  const sidebar = container.querySelector("[data-sidebar='true']")

  return {
    hasHorizontalOverflow: container.scrollWidth > container.clientWidth,
    tableScrollable: tables.every((table) => table.scrollWidth >= table.clientWidth),
    cardsWrapped: cards.length === 0 || cards.every((card) => card.clientWidth <= container.clientWidth),
    sidebarCollapsed: window.innerWidth >= 1024 || Boolean(sidebar)
  }
}

export function useResponsiveValidation(ref: RefObject<HTMLElement | null>) {
  const [result, setResult] = useState<ResponsiveValidationResult>({
    hasHorizontalOverflow: false,
    tableScrollable: true,
    cardsWrapped: true,
    sidebarCollapsed: true
  })

  useEffect(() => {
    const update = () => setResult(validateResponsiveLayout(ref.current))
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [ref])

  return result
}
