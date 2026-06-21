# SolarFlow — Business Rules

## Customer Rules

- `name` required. All other fields optional.
- `organization_id` auto-injected from auth context.
- Stage transitions validated: no backward, no skip.
- Payment: Paid (paid≥total), Partial (paid>0), Pending.
- CLOSED requires payment_status = "Paid".
- Workflow re-evaluates on: create, update, doc upload, task complete.
- Inventory reserved on create with system_id (non-blocking).

## Inventory Rules

- Stock cannot go negative.
- All changes create stock_transactions (append-only ledger).
- Types: reserve, release, consume, purchase, adjustment.
- System availability = min(stock/required) across components.
- Reserved stock unavailable for other systems.

## Task Rules

- `title` required. Priority: Medium. Status: Pending.
- Completed task + related_customer_id → workflow re-evaluates.

## Payment Rules

- Linked via installation_id FK → customers.id.
- Full payment required for INSTALLATION → CLOSED.
- Currently derived from BOTH payments table AND notes parsing.

## Closure Rules

- Requires: installation_completed=true AND payment_status="Paid".
- Terminal state. No further transitions.

## Audit Rules

- All CRUD logs to activity_logs table.
- Logging failures never block primary operations.

## Multi-Tenant Rules

- EVERY query MUST include .eq("organization_id", orgId).
- Cross-org access architecturally impossible.

## Validation Rules

- All entity IDs validated as UUID before DB operations.
- File uploads: max 10MB, PDF/PNG/JPEG/WebP/TXT/DOC/DOCX.
- File names sanitized to a-zA-Z0-9._- only.
