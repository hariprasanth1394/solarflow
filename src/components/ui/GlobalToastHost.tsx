"use client"

import { useSyncExternalStore } from "react"
import NotificationHost from "./NotificationHost"
import {
  dismissToast,
  getServerToastsSnapshot,
  getToastsSnapshot,
  subscribeToasts,
} from "@/lib/toastStore"

export default function GlobalToastHost() {
  const notifications = useSyncExternalStore(
    subscribeToasts,
    getToastsSnapshot,
    getServerToastsSnapshot
  )

  return <NotificationHost notifications={notifications} onDismiss={dismissToast} />
}
