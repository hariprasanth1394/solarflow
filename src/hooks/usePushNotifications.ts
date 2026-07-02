"use client"

import { useCallback, useState } from "react"
import type { PushNotificationItem, PushNotificationType } from "@/components/ui/PushNotification"

type NotifyInput = {
  type: PushNotificationType
  title: string
  description?: string
  duration?: number
}

export function usePushNotifications() {
  const [notifications, setNotifications] = useState<PushNotificationItem[]>([])

  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback(
    ({ type, title, description, duration = 5000 }: NotifyInput) => {
      const id = crypto.randomUUID()
      setNotifications((current) => [...current, { id, type, title, description }])

      if (duration > 0) {
        window.setTimeout(() => {
          dismiss(id)
        }, duration)
      }

      return id
    },
    [dismiss]
  )

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    notify,
    dismiss,
    clearAll
  }
}
