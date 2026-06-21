# 07 — Business Rules

## Customer Rules

### Creation Rules
- Customer `name` is required (non-empty after trim)
- All other fields are optional
- `organization_id` is automatically injected from auth context
- `current_stage` defaults to "CREATED"
- `payment_status` defaults to "Pending"
- If `system_id` is provided, inventory reservation is attempted
- Workflow evaluation is triggered on creation
- Activity log entry is recorded

### Update Rules
- Customer ID must be a valid UUID
- Workflow transition is validated before update:
  - Cannot move backward in stage order
  - Cannot skip stages
  - Cannot reset to CREATED
  - CLOSED requires full payment
  - APPROVED requires approval evidence in notes
  - INSTALLATION requires approval evidence
- Payment fields are recalculated if `total_cost` or `paid_amount` change
- Query cache is invalidated after update
- Activity log records all changed fields

### Deletion Rules
- Customer ID must be a valid UUID
- Hard delete (no soft delete)
- Cache invalidated
- Activity logged
- No cascade handling for related tasks/documents (potential orphans)

### Payment Derivation Rules
```
If total_cost > 0:
  If paid_amount >= total_cost → "Paid"
  If paid_amount > 0 → "Partial"
  Else → "Pending"
Else → "Pending"
```

---

## Task Rules

### Creation Rules
- `title` is required (non-empty after trim)
- `priority` defaults to "Medium"
- `status` defaults to "Pending"
- `organization_id` injected from context
- Activity logged on creation

### Update Rules
- Task ID must be valid UUID
- If status changes to "completed" AND task has `related_customer_id`:
  - Customer workflow is re-evaluated
  - Trigger event: "task-completed"

### Deletion Rules
- Task ID must be valid UUID
- Hard delete
- Activity logged

---

## Inventory Rules

### Spare Parts
- Stock levels tracked per spare part per organization
- `min_stock` threshold triggers low-stock alerts
- `spare_code` serves as SKU identifier
- `cost_price` stored per unit

### Stock Transactions
- Every stock change recorded as a transaction
- Types: `reserve`, `release`, `consume`, `purchase`, `adjustment`
- `reference` field links transaction to context (e.g., `reserve:customer-id`)
- Transactions are append-only (never deleted or modified)

### System Availability
- Availability = minimum(stock_quantity / quantity_required) across all components
- Calculated via database function `calculate_system_inventory_availability`
- Cached for 30 seconds on the server

### Reservation Rules
- Inventory reserved when customer is created with a system
- Reservation creates stock_transaction entries per component
- Release reverses reservation (returns stock)
- Consume marks stock as used (permanent)
- Reservation failure does NOT block customer creation (logged as warning)

---

## System Rules

### System Composition
- A system is defined by `system_name` and `capacity_kw`
- Components are defined in `system_components` as spare_id + quantity_required
- System availability is derived from component stock levels
- Minimum component availability determines system availability

---

## Document Rules

### Upload Validation
- File name must be non-empty
- File size: 1 byte to 10 MB
- Allowed MIME types:
  - `application/pdf`
  - `image/png`, `image/jpeg`, `image/webp`
  - `text/plain`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- File name sanitized (only `a-zA-Z0-9._-` allowed)

### Storage Rules
- Files stored at: `{organizationId}/{folder}/{timestamp}-{sanitized-name}`
- Metadata stored in `documents` table
- Files served via Supabase Storage download

### Workflow Integration
- If `related_customer_id` is provided:
  - Customer workflow is re-evaluated after upload
  - Trigger event: "document-uploaded"
  - Document name is analyzed for stage keywords

---

## Payment Rules

### Recording
- Requires `installation_id` (customer ID), `amount`, `payment_date`
- `payment_method` defaults to "Unknown"
- Payments are linked to customers (via `installation_id` FK → customers.id)
- No validation that payment doesn't exceed total cost

### Payment Status Impact
- Full payment (paid >= total) is required for INSTALLATION → CLOSED transition
- Payment status is recalculated on every customer update
- Derived from both direct fields AND notes parsing (dual source of truth)

---

## Installation Rules

### Pre-Installation
- Customer must be in APPROVED stage
- System must be assigned to customer
- Inventory reservation attempted (non-blocking)

### During Installation
- Tasks linked to customer track installation progress
- Inventory consumed from reserved stock

### Post-Installation
- Installation marked complete via `installation_completed` flag
- Workflow evaluates to INSTALLATION stage
- Full payment required before CLOSED

---

## Closure Rules

### Requirements for Closure
1. Installation must be completed (`installation_completed = true`)
2. Full payment received (`payment_status = "Paid"`)
3. Closure documentation uploaded (recommended but not enforced)
4. `closure_completed` flag set to true

### Post-Closure
- Customer workflow moves to CLOSED
- No further stage transitions allowed
- Customer remains in system for historical reference

---

## Workflow Rules

### Stage Transition Order
```
CREATED → SUBMITTED → APPROVED → INSTALLATION → CLOSED
```

### Stage Transition Evidence
| Transition | Required Evidence |
|-----------|-------------------|
| CREATED → SUBMITTED | Submission documents uploaded (detected by name keywords) |
| SUBMITTED → APPROVED | Status contains "approved" + notes contain "Approval No:" or "Reference:" |
| APPROVED → INSTALLATION | Approval evidence in notes + appropriate status |
| INSTALLATION → CLOSED | Payment status = "Paid" |

### Workflow Evaluation Priority
When multiple signals exist, the highest stage wins:
```
finalStage = max(previousStage, calculatedStage, explicitMinimumStage)
```

---

## Validation Rules

### UUID Validation
- All entity IDs validated before database operations
- Uses `assertValidUUID(value, fieldName)` — throws on invalid
- Format: standard UUID v4

### Organization Scoping
- EVERY database query includes `.eq("organization_id", orgId)`
- Organization ID resolved from authenticated session
- Cross-organization access is impossible at the data layer

---

## Audit Rules

### Activity Logging
All significant actions are logged:
- Customer created/updated/deleted
- Task created/updated/deleted
- Document uploaded/deleted
- Workflow stage transitions

### Log Format
```json
{
  "action": "Customer stage transitioned",
  "entity_type": "customer",
  "entity_id": "uuid",
  "details": {
    "action_type": "workflow-transition",
    "actor": "user name",
    "timestamp": "ISO-8601",
    "previous_state": { "stage": "APPROVED", "status": "..." },
    "new_state": { "stage": "INSTALLATION", "status": "..." },
    "payment": { "total": 0, "paid": 0, "remaining": 0, "status": "Pending" }
  }
}
```

### Logging Failures
- Activity logging failures are silently swallowed
- They do NOT block the primary operation
- Errors are written to console via structured logger

---

## Examples

### Example: Customer Stage Transition
```
1. Manager uploads "DISCOM_Application_Form.pdf" for customer
2. Document upload triggers workflow evaluation
3. Engine detects "application" keyword → submission-related
4. submission_completed flag checked → if true, stage = SUBMITTED
5. customer_progress entry created with trigger_event: "document-uploaded"
6. Activity log: "Stage changed from CREATED → SUBMITTED"
```

### Example: Invalid Transition Attempt
```
1. User attempts to update customer current_stage from CREATED to INSTALLATION
2. validateWorkflowTransition() called
3. Check: INSTALLATION not in ALLOWED_STAGE_TRANSITIONS[CREATED] (only SUBMITTED allowed)
4. Error thrown: "Invalid workflow transition: CREATED -> INSTALLATION is not allowed"
5. Update rejected, no database change
```

### Example: Payment Blocks Closure
```
1. Customer at INSTALLATION stage
2. User attempts to move to CLOSED
3. Payment snapshot derived: { total: 150000, paid: 100000, status: "Partial" }
4. Validation check: payment_status !== "Paid"
5. Error: "Invalid workflow transition: cannot move to Closure without full payment"
6. Transition blocked
```
