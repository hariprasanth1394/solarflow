import type { PushNotificationItem, PushNotificationType } from "@/components/ui/PushNotification"

type Listener = () => void

type ToastInput = {
  type: PushNotificationType
  title: string
  description?: string
  duration?: number
}

const DEFAULT_DURATION = 5000

let toasts: PushNotificationItem[] = []
const listeners = new Set<Listener>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()

// Stable empty snapshot so SSR and pre-mount reads never trigger hydration churn.
const EMPTY_TOASTS: PushNotificationItem[] = []

function emit() {
  listeners.forEach((listener) => listener())
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getToastsSnapshot(): PushNotificationItem[] {
  return toasts
}

export function getServerToastsSnapshot(): PushNotificationItem[] {
  return EMPTY_TOASTS
}

export function dismissToast(id: string): void {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }

  const next = toasts.filter((item) => item.id !== id)
  if (next.length === toasts.length) return

  toasts = next
  emit()
}

export function pushToast({ type, title, description, duration = DEFAULT_DURATION }: ToastInput): string {
  const id = createId()
  toasts = [...toasts, { id, type, title, description }]
  emit()

  if (duration > 0 && typeof window !== "undefined") {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), duration)
    )
  }

  return id
}

export function clearAllToasts(): void {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
  if (toasts.length === 0) return
  toasts = []
  emit()
}

/**
 * Unified toast API. Use from anywhere (pages, modals, services) to surface a
 * single, consistent notification. Rendered once by <GlobalToastHost /> in the
 * app layout (top-right on desktop, full-width top on mobile).
 */
export const toast = {
  success: (title: string, description?: string, duration?: number) =>
    pushToast({ type: "success", title, description, duration }),
  error: (title: string, description?: string, duration?: number) =>
    pushToast({ type: "error", title, description, duration }),
  warning: (title: string, description?: string, duration?: number) =>
    pushToast({ type: "warning", title, description, duration }),
  info: (title: string, description?: string, duration?: number) =>
    pushToast({ type: "info", title, description, duration }),
  dismiss: dismissToast,
  clear: clearAllToasts,
}
