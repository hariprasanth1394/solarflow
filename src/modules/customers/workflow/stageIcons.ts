import { FileText, Flag, UserRound, Zap, type LucideIcon } from "lucide-react"
import type { WorkflowStageKey } from "./types"

export function iconForStage(stageKey: WorkflowStageKey): LucideIcon {
  if (stageKey === "CREATED") return UserRound
  if (stageKey === "GOVERNMENT_APPROVAL") return FileText
  if (stageKey === "INSTALLATION") return Zap
  return Flag
}
