import { useEffect } from "react"

/** Locks background scroll on mobile (iOS-safe fixed body pattern). */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof window === "undefined") return

    const scrollY = window.scrollY
    const { style } = document.body
    const previous = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width,
      overflow: style.overflow,
    }

    style.position = "fixed"
    style.top = `-${scrollY}px`
    style.left = "0"
    style.right = "0"
    style.width = "100%"
    style.overflow = "hidden"

    return () => {
      style.position = previous.position
      style.top = previous.top
      style.left = previous.left
      style.right = previous.right
      style.width = previous.width
      style.overflow = previous.overflow
      window.scrollTo(0, scrollY)
    }
  }, [locked])
}
