"use client"

import Modal from "@/components/ui/Modal"
import { formatDateTimeUTC } from "@/utils/dateFormat"

type ActivityItem = {
  id: string
  action: string
  details: unknown
  created_at: string
}

type ActivityLogModalProps = {
  open: boolean
  activities: ActivityItem[]
  onClose: () => void
}

function ActivityDetails({ details }: { details: unknown }) {
  if (!details || typeof details !== "object") return null
  const record = details as Record<string, unknown>

  return (
    <div className="mt-1 space-y-0.5 text-[11px] text-[var(--sf-muted-text)]">
      {"actor" in record ? <p>By: {String(record.actor)}</p> : null}
      {"timestamp" in record ? <p>At: {formatDateTimeUTC(String(record.timestamp))}</p> : null}
      {"previous_state" in record && "new_state" in record ? (
        <p>
          {String((record.previous_state as Record<string, unknown>)?.stage ?? "-")} {"->"}{" "}
          {String((record.new_state as Record<string, unknown>)?.stage ?? "-")}
        </p>
      ) : null}
    </div>
  )
}

export default function ActivityLogModal({ open, activities, onClose }: ActivityLogModalProps) {
  return (
    <Modal
      open={open}
      title="Activity Log"
      subtitle={`${activities.length} ${activities.length === 1 ? "event" : "events"} recorded`}
      showCloseButton
      panelClassName="sf-modal-panel-wide"
      mobileFullscreen
      onClose={onClose}
      bodyClassName="p-0"
    >
      {activities.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-[var(--sf-muted-text)]">
          No activity recorded yet.
        </div>
      ) : (
        <div className="sf-activity-timeline sf-scroll-area px-6 py-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="sf-activity-item flex gap-3">
              <div className="flex flex-col items-center">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--sf-primary-start)]" />
                {index < activities.length - 1 ? (
                  <div className="mt-1 w-px flex-1 bg-[var(--sf-card-border)]" />
                ) : null}
              </div>
              <div className="min-w-0 pb-4">
                <p className="text-sm text-[var(--sf-text)]">{activity.action}</p>
                <ActivityDetails details={activity.details} />
                <p className="mt-0.5 text-[11px] text-[var(--sf-muted-text)]">
                  {formatDateTimeUTC(activity.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
