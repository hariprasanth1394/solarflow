export type WorkflowStageKey = "CREATED" | "GOVERNMENT_APPROVAL" | "INSTALLATION" | "CLOSURE"

export type WorkflowBadgeTone = "pending" | "inProgress" | "approved" | "completed"

export type WorkflowActionKey =
  | "SUBMIT_APPROVAL_DOCUMENTS"
  | "MARK_GOVERNMENT_APPROVED"
  | "START_INSTALLATION"
  | "MARK_INSTALLATION_COMPLETED"
  | "CLOSE_PROJECT"

export type StageStatusOption = {
  value: string
  label: string
  tone: WorkflowBadgeTone
}

export type StageAction = {
  key: WorkflowActionKey
  label: string
  stage: WorkflowStageKey
}

export type StageDefinition = {
  key: WorkflowStageKey
  order: number
  title: string
  statuses: StageStatusOption[]
  actions: StageAction[]
}
