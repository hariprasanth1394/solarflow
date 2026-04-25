"use client"

import { ArrowUp } from "lucide-react"
import { useEffect, useState } from "react"

export default function GoTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const scrollContainer = document.querySelector('[data-app-scroll-container="true"]') as HTMLElement | null
    const target: HTMLElement | Window = scrollContainer ?? window

    const onScroll = () => {
      const offset = scrollContainer ? scrollContainer.scrollTop : window.scrollY
      setVisible(offset > 260)
    }

    target.addEventListener("scroll", onScroll as EventListener, { passive: true })
    onScroll()
    return () => target.removeEventListener("scroll", onScroll as EventListener)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      className="go-top z-30 inline-flex items-center justify-center"
      onClick={() => {
        const scrollContainer = document.querySelector('[data-app-scroll-container="true"]') as HTMLElement | null
        if (scrollContainer) {
          scrollContainer.scrollTo({ top: 0, behavior: "smooth" })
          return
        }
        window.scrollTo({ top: 0, behavior: "smooth" })
      }}
      aria-label="Go to top"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  )
}