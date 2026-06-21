import { ChevronDown, ChevronRight, CircleCheck, Loader2 } from "lucide-react"
import type { StageAction, StageDefinition, WorkflowBadgeTone } from "./types"
import { iconForStage } from "./stageIcons"
import { workflowStatusBadgeClass, workflowStatusBadgeShowsCheck } from "./workflowStatusBadge"

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

function stageIndicatorClass(current: boolean, isCompleted: boolean) {
  if (current) return "workflow-stage-indicator-active"
  if (isCompleted) return "workflow-stage-indicator-completed"
  return "workflow-stage-indicator-upcoming"
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
  const primaryAction = stage.actions[0] ?? null
  const secondaryActions = stage.actions.slice(1)
  const StageIcon = iconForStage(stage.key)

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
          <div
            className={`workflow-stage-indicator flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-200 ${stageIndicatorClass(current, isCompleted)}`}
          >
            {current ? (
              <>
                <span className="workflow-step-pulse-ring" aria-hidden />
                <StageIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
              </>
            ) : isCompleted ? (
              <CircleCheck className="h-3.5 w-3.5" strokeWidth={2} />
            ) : (
              <StageIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">Stage {stage.order}</p>
            <h3
              className={`font-semibold leading-tight transition-all ${
                current
                  ? "text-[15px] text-[var(--sf-primary-start)]"
                  : isCompleted
                  ? "text-[13px] font-medium text-[var(--sf-text)]"
                  : "text-[13px] font-normal text-[var(--sf-muted-text)]"
              }`}
            >
              {stage.title}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={workflowStatusBadgeClass(statusTone, statusLabel)}>
            {workflowStatusBadgeShowsCheck(statusTone, statusLabel) ? (
              <CircleCheck className="h-3 w-3 shrink-0" strokeWidth={2} />
            ) : null}
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
              {isCompleted ? "This stage is complete." : "No actions required at this time."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
