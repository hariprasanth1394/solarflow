import dynamic from "next/dynamic"

const NotificationsPage = dynamic(() => import("@/modules/notifications/NotificationsPage"))

export default function NotificationsRoutePage() {
  return <NotificationsPage />
}
