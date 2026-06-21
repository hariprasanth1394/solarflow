# SolarFlow — Workflow Rules

## Stage Order (Immutable)

```
CREATED → SUBMITTED → APPROVED → INSTALLATION → CLOSED
```

## Allowed Transitions

| From | To | Evidence Required |
|------|----|-------------------|
| CREATED | SUBMITTED | Submission docs uploaded |
| SUBMITTED | APPROVED | Status "approved" + "Approval No:" in notes |
| APPROVED | INSTALLATION | Approval evidence + valid status |
| INSTALLATION | CLOSED | payment_status = "Paid" |

## Blocked Transitions

- ANY → CREATED (no reset)
- Backward (higher → lower index)
- Skip stages (CREATED → APPROVED)
- CLOSED → ANY (terminal)
- INSTALLATION → CLOSED without full payment

## Invariants

1. Approval cannot regress after granted.
2. Closure requires full payment. No exceptions.
3. Installation requires approval evidence in notes.
4. Stages cannot be skipped.
5. Evaluation is idempotent.

## Stage Completion Flags (customers table)

| Flag | Stage |
|------|-------|
| submission_completed | SUBMITTED |
| approval_completed | APPROVED |
| installation_completed | INSTALLATION |
| closure_completed | CLOSED |

## Triggers That Re-Evaluate Workflow

- Customer created → "customer-created"
- Customer updated → "approval-updated"
- Document uploaded → "document-uploaded"
- Task completed → "task-completed"
- Manual stage complete → "stage-{name}-completed"

## Evaluation Logic

1. Fetch projection + completion flags
2. Calculate: closure→install→approval→submission→created
3. Final = highest(previous, calculated, explicit minimum)
4. If changed → update DB + log progress + log activity

## Inventory Lifecycle

- Customer created with system_id → RESERVE components
- Installation → RELEASE reserved → CONSUME (permanent)
- Reference: `{action}:{customerId}:{spareId}`
