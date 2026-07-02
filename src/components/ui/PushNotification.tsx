"use client"

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react"

export type PushNotificationType = "success" | "error" | "warning" | "info"

export type PushNotificationItem = {
  id: string
  type: PushNotificationType
  title: string
  description?: string
}

type PushNotificationProps = {
  notification: PushNotificationItem
  onDismiss: (id: string) => void
}

const iconByType = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
} as const

export default function PushNotification({ notification, onDismiss }: PushNotificationProps) {
  const Icon = iconByType[notification.type]

  return (
    <div
      className={`sf-push-notification sf-push-notification--${notification.type}`}
      role="status"
      aria-live="polite"
    >
      <span className="sf-push-notification-accent" aria-hidden="true" />
      <Icon className="sf-push-notification-icon" aria-hidden="true" />
      <div className="sf-push-notification-copy">
        <p className="sf-push-notification-title">{notification.title}</p>
        {notification.description ? (
          <p className="sf-push-notification-description">{notification.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        className="sf-push-notification-dismiss"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(notification.id)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
