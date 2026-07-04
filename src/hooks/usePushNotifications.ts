"use client"

import { useCallback } from "react"
import type { PushNotificationItem, PushNotificationType } from "@/components/ui/PushNotification"
import { clearAllToasts, dismissToast, pushToast } from "@/lib/toastStore"

type NotifyInput = {
  type: PushNotificationType
  title: string
  description?: string
  duration?: number
}

// Stable empty list: notifications now render through the single global
// <GlobalToastHost /> mounted in AppLayout, so any local <NotificationHost>
// bound to this array renders nothing (no duplicate stacks).
const EMPTY: PushNotificationItem[] = []

/**
 * Backwards-compatible hook that proxies to the unified global toast store.
 * Existing call sites keep using notify/dismiss unchanged; toasts now surface
 * from one shared host with consistent placement and styling.
 */
export function usePushNotifications() {
  const notify = useCallback((input: NotifyInput) => pushToast(input), [])
  const dismiss = useCallback((id: string) => dismissToast(id), [])
  const clearAll = useCallback(() => clearAllToasts(), [])

  return {
    notifications: EMPTY,
    notify,
    dismiss,
    clearAll,
  }
}
