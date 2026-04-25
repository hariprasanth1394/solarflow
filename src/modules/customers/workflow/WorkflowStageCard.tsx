import { Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import type { StageAction, StageDefinition, WorkflowBadgeTone } from "./types"

type WorkflowStageCardProps = {
  stage: StageDefinition
  current: boolean
  expanded: boolean
  statusLabel: string
  statusTone: WorkflowBadgeTone
  onActionClick: (action: StageAction) => void
  onToggle: () => void
  loadingActionKey: string | null
}

function toneBadgeClass(tone: WorkflowBadgeTone) {
  if (tone === "pending") return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
  if (tone === "inProgress") return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200"
  if (tone === "approved") return "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200"
  return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
}

export default function WorkflowStageCard({
  stage,
  current,
  expanded,
  statusLabel,
  statusTone,
  onActionClick,
  onToggle,
  loadingActionKey,
}: WorkflowStageCardProps) {
  const isCompleted = statusTone === "completed" && !current
  const isUpcoming = !current && !isCompleted
  const primaryAction = stage.actions[0] ?? null
  const secondaryActions = stage.actions.slice(1)

  return (
    <div
      className={`relative transition-all duration-200 ${
        current
          ? "current-stage-card"
          : isCompleted
          ? "completed-stage-card"
          : "pending-stage-card opacity-70"
      }`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between gap-3 py-4 pl-6 pr-5 text-left transition-colors ${
          current ? "hover:bg-violet-500/10" : "hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-3.5">
          {/* Step circle */}
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-200 ${
              current
                ? "bg-violet-600 text-white shadow-[0_0_0_4px_rgba(124,58,237,0.2)]"
                : isCompleted
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {isCompleted ? <Check className="h-3.5 w-3.5" /> : stage.order}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">Stage {stage.order}</p>
            <h3
              className={`font-semibold leading-tight transition-all ${
                current
                  ? "text-[15px] text-violet-500"
                  : isCompleted
                  ? "text-[13px] text-emerald-600"
                  : "text-[13px] text-slate-400"
              }`}
            >
              {stage.title}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center rounded-[6px] px-2.5 py-1 text-[11px] font-semibold ${toneBadgeClass(statusTone)}`}>
            {statusLabel}
          </span>
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded body */}
      {expanded ? (
        <div className="stage-expanded">
          {primaryAction ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="stage-description">
                  {current ? "Take the next step to advance this stage." : "This stage is not currently active."}
                </p>
                <button
                  type="button"
                  onClick={() => onActionClick(primaryAction)}
                  disabled={!current || loadingActionKey !== null}
                  className="btn btn-primary btn-compact customer-primary-btn shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingActionKey === primaryAction.key ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    primaryAction.label
                  )}
                </button>
              </div>

              {secondaryActions.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200/60 pt-3">
                  {secondaryActions.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => onActionClick(action)}
                      disabled={!current || loadingActionKey !== null}
                      className="btn btn-secondary btn-compact disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {loadingActionKey === action.key ? "Saving…" : action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="stage-description">
              {isCompleted ? "This stage is complete ✓" : "No actions required at this time."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
