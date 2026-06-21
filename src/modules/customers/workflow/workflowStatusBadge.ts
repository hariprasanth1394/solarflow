import type { WorkflowBadgeTone } from "./types"

const BADGE_BASE = "inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[10px] font-medium leading-none"

export function workflowStatusBadgeClass(tone: WorkflowBadgeTone, label: string): string {
  const normalized = label.trim().toLowerCase()

  if (normalized === "closed") {
    return `${BADGE_BASE} workflow-badge-closed`
  }

  if (tone === "completed" || normalized === "completed") {
    return `${BADGE_BASE} workflow-badge-completed`
  }

  if (normalized === "payment pending") {
    return `${BADGE_BASE} workflow-badge-warning`
  }

  if (
    tone === "inProgress" ||
    tone === "approved" ||
    normalized === "submitted" ||
    normalized === "in progress" ||
    normalized === "closure ready"
  ) {
    return `${BADGE_BASE} workflow-badge-in-progress`
  }

  return `${BADGE_BASE} workflow-badge-pending`
}

export function workflowStatusBadgeShowsCheck(tone: WorkflowBadgeTone, label: string) {
  const normalized = label.trim().toLowerCase()
  return tone === "completed" || normalized === "completed" || normalized === "closed"
}
