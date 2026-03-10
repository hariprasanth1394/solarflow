import { ChevronDown, ChevronUp } from "lucide-react"
import type { StageAction, StageDefinition, WorkflowBadgeTone } from "./types"

type WorkflowStageCardProps = {
  stage: StageDefinition
  current: boolean
  expanded: boolean
  statusLabel: string
  statusTone: WorkflowBadgeTone
  onActionClick: (action: StageAction) => void
  loadingActionKey: string | null
}

function toneClassName(tone: WorkflowBadgeTone) {
  if (tone === "pending") return "bg-orange-50 text-orange-700 border-orange-100"
  if (tone === "inProgress") return "bg-purple-50 text-purple-700 border-purple-100"
  if (tone === "approved") return "bg-blue-50 text-blue-700 border-blue-100"
  return "bg-emerald-50 text-emerald-700 border-emerald-100"
}

const primaryButtonClass =
  "rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 px-4 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"

const secondaryButtonClass = "rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"

export default function WorkflowStageCard({
  stage,
  current,
  expanded,
  statusLabel,
  statusTone,
  onActionClick,
  loadingActionKey
}: WorkflowStageCardProps) {
  return (
    <article className="rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Stage {stage.order}</p>
          <h3 className="mt-1 text-base font-semibold text-gray-900">{stage.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClassName(statusTone)}`}>{statusLabel}</span>
          <span className="text-gray-400">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs text-gray-500">Available statuses</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {stage.statuses.map((status) => (
                <span key={status.value} className={`rounded-full border px-2.5 py-1 text-xs ${toneClassName(status.tone)}`}>
                  {status.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {stage.actions.map((action, index) => (
              <button
                key={action.key}
                type="button"
                onClick={() => onActionClick(action)}
                className={index === 0 ? primaryButtonClass : secondaryButtonClass}
                disabled={!current || loadingActionKey !== null}
              >
                {loadingActionKey === action.key ? "Saving..." : action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  )
}
