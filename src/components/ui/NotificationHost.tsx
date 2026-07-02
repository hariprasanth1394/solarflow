"use client"

import PushNotification, { type PushNotificationItem } from "./PushNotification"

type NotificationHostProps = {
  notifications: PushNotificationItem[]
  onDismiss: (id: string) => void
}

export default function NotificationHost({ notifications, onDismiss }: NotificationHostProps) {
  if (notifications.length === 0) return null

  return (
    <div className="sf-notification-host" aria-label="Notifications">
      {notifications.map((notification) => (
        <PushNotification key={notification.id} notification={notification} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
