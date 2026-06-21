# 14 — AI Instructions (Steering Document)

## Purpose

This document provides context and rules for AI assistants (Cursor, Kiro, Claude Code, GitHub Copilot) working on the SolarFlow codebase. Follow these instructions to maintain consistency, prevent regressions, and respect architectural decisions.

---

## Project Goals

SolarFlow is a **Solar ERP/CRM SaaS platform** for solar installation companies. The application manages:
1. Customer lifecycle through government approval → installation → closure
2. Solar component inventory with system availability tracking
3. Task management linked to customer projects
4. Document management for compliance
5. Payment tracking across installations

**Target**: Production-grade, multi-tenant SaaS for solar industry operations.

---

## Business Rules (Must Preserve)

### Customer Workflow (CRITICAL — Never Break)
```
CREATED → SUBMITTED → APPROVED → INSTALLATION → CLOSED
```

**Rules that must be preserved**:
- Stages can only move FORWARD (never backward)
- Stages cannot be skipped
- SUBMITTED requires government submission evidence
- APPROVED requires approval reference number in notes
- INSTALLATION requires prior APPROVED stage
- CLOSED requires `payment_status = "Paid"` (full payment)
- Workflow evaluation fires on: customer create/update, document upload, task completion
- Stage transitions logged to `customer_progress` table

### Inventory Rules (Must Preserve)
- Stock levels cannot go negative
- System availability = min(component stock / required quantity)
- All stock changes create `stock_transactions` entries
- Transaction types: reserve, release, consume, purchase, adjustment
- Reserved stock is not available for other systems

### Organization Scoping (CRITICAL)
- Every database query MUST include `.eq("organization_id", orgId)`
- Data isolation between organizations is non-negotiable
- Never allow cross-organization data access

---

## Design Principles

### Architecture
- **Layered**: Pages → Modules → Services → Repositories → Supabase
- **Unidirectional data flow**: Components call services, services call repositories
- **Single responsibility**: Each service handles one domain entity
- **Context injection**: `withRequestContext` provides org/user to all services

### UI
- **CSS Variables for theming** — Never hardcode colors
- **Dark mode parity** — Every UI element must work in both modes
- **Mobile-first** — Design for mobile, enhance for desktop
- **Tailwind CSS** — Use utility classes, not custom CSS unless for design system tokens
- **Inter font** — All text uses the Inter font family

---

## Architecture Rules

### Do NOT
- Import from `modules/` into `components/` (dependency flows downward only)
- Access Supabase directly from components (always go through services)
- Use `select("*")` in database queries (always specify columns)
- Return internal error details to the client
- Store sensitive data in localStorage (use cookies for auth tokens)
- Use class components (functional only)
- Add new global state libraries without discussion
- Create API routes for operations that can be done client-side via services

### Always DO
- Validate UUIDs before database operations (`assertValidUUID`)
- Scope all queries by `organization_id`
- Log operations with structured context (`logInfo`, `logError`)
- Invalidate query cache after mutations
- Use TypeScript strict typing (no `any` without comment justification)
- Wrap service functions in `withRequestContext`
- Handle errors at the service layer (try/catch + log + generic rethrow)

---

## Workflow Rules

### Stage Transition Validation
When modifying customer update logic, ALWAYS ensure:
1. `validateWorkflowTransition()` is called before any stage change
2. The `ALLOWED_STAGE_TRANSITIONS` map is respected
3. Payment validation runs for CLOSED transitions
4. Approval evidence is checked for APPROVED and INSTALLATION transitions
5. `evaluateCustomerWorkflow()` fires after every customer modification

### Workflow Triggers
These events MUST trigger workflow re-evaluation:
- Customer created
- Customer updated (especially stage/status fields)
- Document uploaded (with `related_customer_id`)
- Task completed (with `related_customer_id`)

---

## Coding Rules

### Service Pattern (Copy This)
```typescript
export async function operationName(id: string, payload: SomeType) {
  assertValidUUID(id, "entityId")

  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      // 1. Fetch current state if needed
      // 2. Validate business rules
      // 3. Perform database operation
      // 4. Invalidate cache
      // 5. Log activity
      // 6. Log info

      const data = await repositoryFunction(organizationId, ...)
      invalidateQueryCacheByPrefix(`entity:list:${organizationId}:`)
      await logActivity("Entity action", "entity", id, { details })
      logInfo("Operation completed", { service: "serviceName", organizationId, userId, entityId: id })
      return data
    } catch (error) {
      logError("Operation failed", error, { service: "serviceName", organizationId, userId, entityId: id })
      throw new Error("Operation failed")
    }
  })
}
```

### Repository Pattern (Copy This)
```typescript
export async function fetchEntity(orgId: string, id: string) {
  assertValidUUID(id, "entityId")
  assertValidUUID(orgId, "organizationId")

  const { data, error } = await supabase
    .from("table_name")
    .select("col1,col2,col3")
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle()

  if (error) handleRepositoryError("repoName", "fetchEntity", error)
  return data
}
```

---

## UI Rules

### Component Patterns
- Use `PageContainer` for page layout (title, breadcrumbs)
- Use `ContentArea` to wrap page content sections
- Use `FilterBar` for search/filter above lists
- Use `DataTable` for tabular data (TypeScript version)
- Use `AppModal` for modal dialogs
- Use `StatCard` for dashboard metrics
- Use `ChartCard` for chart wrappers

### Styling Rules
- Use design system CSS variables: `var(--sf-card-bg)`, `var(--sf-text)`, etc.
- Dark mode via `theme-dark` / `dark` class on `<html>`
- Button heights: 40px standard
- Input heights: 40px standard
- Border radius: use tokens (`var(--radius-sm)`, `var(--radius-md)`, `var(--radius-lg)`)
- Responsive: `grid-cols-1 md:grid-cols-2 xl:grid-cols-4`
- Mobile padding: `p-4`, Desktop: `p-6`

---

## RBAC Rules (For Future Implementation)

When implementing RBAC:
- Check role at service layer, not just UI
- Supabase RLS as defense-in-depth
- Never trust client-provided role information
- Admin actions logged separately in activity_logs
- Role changes require admin confirmation

---

## Restrictions (AI Must Never Modify Without Approval)

### Critical Files — Require Human Approval
- `src/services/customerWorkflowService.ts` (workflow engine)
- `src/services/customerService.ts` (workflow validation logic)
- `src/lib/orgContext.ts` (auth context resolution)
- `src/middleware/authMiddleware.ts` (route protection)
- `src/components/auth/AuthSessionSync.tsx` (session management)
- `src/repositories/customerWorkflowRepository.ts` (workflow DB access)
- `.env.local` (credentials)
- `database.types.ts` (auto-generated — regenerate, don't manually edit)

### Never Do
- Remove organization scoping from queries
- Simplify workflow validation (always validate transitions)
- Change the stage order (CREATED → SUBMITTED → APPROVED → INSTALLATION → CLOSED)
- Remove activity logging from CRUD operations
- Expose internal errors to client responses
- Add `dangerouslySetInnerHTML` without XSS sanitization
- Remove cookie-based auth checks
- Import server-only code into client components
- Use `any` type without justification comment

---

## Things AI Must Always Validate

Before submitting any change:
1. ✅ Organization scoping present in new queries
2. ✅ UUID validation on entity ID parameters
3. ✅ Error handling follows service pattern (try/catch/log/rethrow)
4. ✅ Cache invalidation after mutations
5. ✅ Activity logging for CRUD operations
6. ✅ Dark mode compatibility (no hardcoded colors)
7. ✅ Mobile responsiveness (test at 375px width)
8. ✅ TypeScript strict compliance (no untyped code)
9. ✅ Import order follows convention
10. ✅ No `console.log` in production code (use `logInfo`/`logError`)

---

## Consistency Preservation Checklist

| Area | Rule |
|------|------|
| Workflow | Stage order never changes, transitions never skip |
| Design | CSS variables for all colors, dark mode support |
| RBAC | Organization scoping on every query (even when RBAC not yet implemented) |
| Data | UUID validation, cache invalidation, activity logging |
| Mobile | Responsive grids, touch-friendly targets (min 40px), bottom bar considerations |
| Dark mode | Every new component tested in both modes |
