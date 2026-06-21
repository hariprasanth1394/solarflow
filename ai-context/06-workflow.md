# 06 — Workflow Engine

## Overview

SolarFlow implements a linear workflow engine for customer lifecycle management. The workflow tracks a customer from initial creation through government approval, physical installation, and project closure.

---

## Customer Lifecycle Workflow

### Stage Definitions

| Stage | Code | Description |
|-------|------|-------------|
| Created | `CREATED` | Customer record created, pending government submission |
| Submitted | `SUBMITTED` | Government application submitted |
| Approved | `APPROVED` | Government approval received |
| Installation | `INSTALLATION` | Physical installation in progress |
| Closed | `CLOSED` | Project complete, all payments collected |

### Stage Flow

```
CREATED → SUBMITTED → APPROVED → INSTALLATION → CLOSED
```

### Stage Completion Flags

Each stage has a corresponding boolean flag on the `customers` table:

| Flag | Stage | Purpose |
|------|-------|---------|
| `submission_completed` | SUBMITTED | Government submission documents uploaded |
| `approval_completed` | APPROVED | Approval reference documented |
| `installation_completed` | INSTALLATION | Physical installation done |
| `closure_completed` | CLOSED | Final documentation and payment complete |

---

## Status Transitions

### Allowed Transitions

| From | To | Conditions |
|------|----|------------|
| CREATED | SUBMITTED | Upload government submission documents |
| SUBMITTED | APPROVED | Approval reference documented, status includes "approved" |
| APPROVED | INSTALLATION | Approval evidence exists, status valid |
| INSTALLATION | CLOSED | Full payment received (payment_status = "Paid") |

### Invalid Transitions

| Transition | Reason |
|-----------|--------|
| Any → CREATED | Cannot reset to Created |
| SUBMITTED → CREATED | Cannot move backward |
| CLOSED → Any | Cannot reopen closed projects |
| CREATED → APPROVED | Cannot skip Submitted |
| CREATED → INSTALLATION | Cannot skip stages |
| SUBMITTED → INSTALLATION | Cannot skip Approved |
| APPROVED → CLOSED | Cannot skip Installation |
| INSTALLATION → CLOSED (unpaid) | Payment must be complete |

### Transition Validation Rules

**SUBMITTED → APPROVED requires**:
- Source stage must be SUBMITTED
- Status field must include "approved"
- Notes must contain approval reference (`Approval No:` or `Reference:`)

**APPROVED → INSTALLATION requires**:
- Source stage must be APPROVED
- Status must be approved, in-progress, or pending
- Approval document reference must exist in notes

**INSTALLATION → CLOSED requires**:
- Source stage must be INSTALLATION
- Full payment required (`payment_status = "Paid"`)
- Payment derived from notes parsing: `Total Amount:` and `Paid Amount:` fields

---

## Workflow Evaluation Engine

### Core Function: `evaluateCustomerWorkflow()`

**Trigger events**:
- Customer created
- Customer updated
- Document uploaded
- Task completed
- Manual stage completion

**Evaluation logic**:
1. Fetch customer's current stage from database
2. Fetch stage completion flags
3. Calculate stage from completions:
   - `closure_completed` → CLOSED
   - `installation_completed` → INSTALLATION
   - `approval_completed` → APPROVED
   - `submission_completed` → SUBMITTED
   - Otherwise → CREATED
4. Take the highest of: previous stage, calculated stage, explicit minimum stage
5. If changed: update `current_stage` in database
6. Log progress entry to `customer_progress` table
7. Log activity for audit trail

### Stage Completion Function: `completeCustomerStage()`

- Marks a specific stage flag as `true`
- Prevents double-completion (idempotent)
- Prevents completing CREATED (not a real stage)
- Re-evaluates workflow after marking complete
- Returns new current stage

---

## Workflow Triggers

### Document Upload Trigger
When a document is uploaded for a customer:
- `evaluateCustomerWorkflow` is called with `triggerEvent: "document-uploaded"`
- The workflow engine checks if document names indicate stage progression (submission, approval, closure keywords)

### Task Completion Trigger
When a task linked to a customer is marked complete:
- `evaluateCustomerWorkflow` is called with `triggerEvent: "task-completed"`
- Allows workflow to advance if task represents stage work

### Customer Update Trigger
Every customer edit:
- Validates transition if `current_stage` changed in payload
- Calls `evaluateCustomerWorkflow` with `triggerEvent: "approval-updated"`

### Customer Creation Trigger
On new customer:
- `evaluateCustomerWorkflow` called with `triggerEvent: "customer-created"`
- Forces persist of initial progress entry
- Reserves inventory if system assigned

---

## Task Workflow

### Task Status Values
- Pending (default)
- In Progress
- Completed

### Task-Customer Integration
- Tasks can be linked to customers via `related_customer_id`
- When a task is marked "completed", the customer workflow is re-evaluated
- This allows installation tasks to drive stage progression

---

## Payment Workflow

### Payment Status Derivation
Payment status is derived from the `notes` field using regex parsing:

```
Total Amount: 150000
Paid Amount: 100000
Payment Status: Partial
```

### Payment Rules
| Condition | Status |
|-----------|--------|
| paid >= total | Paid |
| paid > 0 && paid < total | Partial |
| paid == 0 | Pending |

### Payment Impact on Workflow
- INSTALLATION → CLOSED requires `payment_status = "Paid"`
- Payment updates trigger workflow re-evaluation
- Partial payments are tracked but don't advance stage

---

## Document Workflow

### Document Types by Stage

| Stage | Expected Documents |
|-------|--------------------|
| SUBMITTED | Government submission forms, permit applications, DISCOM applications |
| APPROVED | Approval letters, verification certificates |
| INSTALLATION | Installation photos, completion certificates |
| CLOSED | Handover documents, final inspection reports |

### Document Stage Detection
The workflow engine parses document names to detect stage relevance:
- Submission keywords: "submission", "permit", "application", "discom"
- Approval keywords: "approval", "approved", "verification"
- Closure keywords: "closure", "handover", "completion"

---

## Installation Workflow

### Inventory Integration
When a customer is created with a `system_id`:
1. System components are fetched from `system_components` table
2. Inventory is reserved (stock_transaction with type "reserve")
3. If reservation fails (out of stock), a warning is logged but customer creation continues

### Installation Completion
- Installation completion consumes reserved inventory
- Stock transactions track reserve → consume lifecycle
- System availability is recalculated after consumption

---

## Identified Workflow Bugs & Inconsistencies

| Issue | Severity | Description |
|-------|----------|-------------|
| Dual status tracking | High | Both `status` (free text) and `current_stage` (enum-like) exist, causing normalization complexity |
| Payment parsing from notes | High | Financial data derived from regex parsing of free-text notes field — fragile and error-prone |
| No stage rollback | Medium | If a stage was completed in error, there's no way to roll back |
| Document stage detection is name-based | Medium | Relies on filename keywords — easily bypassed or missed |
| Inventory reservation on create | Medium | Reserves inventory before approval — may cause stock conflicts |
| No concurrent transition protection | Medium | Two users could trigger conflicting transitions simultaneously |
| `inventory_movements` table untyped | Low | Referenced in code but not in database types — potential runtime errors |
| Workflow evaluation is fire-and-forget | Low | Workflow errors are caught and logged but never surfaced to users |

---

## Workflow Integrity Rules (Guards)

These rules are enforced by `validateWorkflowTransition()` in `customerService.ts`:

| Rule | Guard | Enforcement |
|------|-------|-------------|
| No backward movement | `toIndex >= fromIndex` check | Hard block — throws error |
| No stage skipping | `ALLOWED_STAGE_TRANSITIONS` map | Hard block — throws error |
| Cannot reset to CREATED | Explicit check | Hard block — throws error |
| Approval requires evidence | Notes must contain "Approval No:" or "Reference:" | Hard block — throws error |
| Installation requires APPROVED | Source stage check | Hard block — throws error |
| Closure requires full payment | `payment_status = "Paid"` check | Hard block — throws error |
| Stages are monotonic | `highestStage()` picks max | Soft — always advances |
| Duplicate completion is idempotent | `wasAlreadyCompleted` flag | Soft — returns early |

### Task Lifecycle Integration
- Tasks linked to customers via `related_customer_id`
- Task completion (`status = "completed"`) triggers `evaluateCustomerWorkflow`
- **Note**: Currently no guard prevents INSTALLATION completion while tasks are open (MISSING GUARD)

### Inventory Lifecycle Integration
- Customer creation with `system_id` → reserves inventory
- Inventory consumption happens at installation start
- Reservation is idempotent (checks existing references)
- **Note**: No guard prevents system assignment if stock is insufficient (SOFT FAIL — warns only)

### Payment Lifecycle Integration
- Payments tracked in `payments` table AND parsed from `notes` field (dual source)
- Full payment required for CLOSED transition
- Partial payments do not advance workflow
- **Note**: No guard ensures `payments` table totals match `notes` field amounts (INCONSISTENCY RISK)
