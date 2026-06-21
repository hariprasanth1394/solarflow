# SolarFlow — Architecture Rules

## Layered Architecture

```
Pages (src/app/) → Modules (src/modules/) → Services (src/services/)
  → Repositories (src/repositories/) → Supabase (src/lib/supabaseClient.ts)
```

Dependency flows downward only. Never import upward.

## Module Boundaries

- components/ — Reusable, domain-agnostic UI primitives
- modules/ — Feature-specific pages. Import from components/ and services/
- services/ — Business logic. Import from repositories/
- repositories/ — Data access only. Import from lib/supabaseClient
- lib/ — Shared infra (client, cache, context)
- utils/ — Pure functions, no side effects

## Forbidden Imports

- Never: modules/ → components/ (wrong direction)
- Never: components/ → Supabase directly
- Never: modules/ → repositories/ directly (use services)

## Service Requirements

Every service function MUST:
1. Validate inputs (assertValidUUID)
2. Wrap in withRequestContext
3. Call repository for data
4. Invalidate cache after mutations
5. Log activity for CRUD
6. Use logInfo/logError structured logging
7. Throw generic Error("Operation failed") to callers

## Repository Requirements

Every repository function MUST:
1. Accept organizationId as first param
2. Include .eq("organization_id", orgId)
3. Select explicit columns
4. Use handleRepositoryError()
5. Return { data, error, count? }

## Supabase Access

- One singleton client (supabaseClient.ts)
- Request-scoped clients for API routes (Bearer token)
- Never create ad-hoc clients in services/components
- Auth context via orgContext.ts (cached 2s)

## New Feature Checklist

1. Service function (business logic)
2. Repository function (data access)
3. Module component (page UI)
4. Reuse existing components/ primitives
5. Add activity logging + cache invalidation
6. Add // TODO: RBAC for future role gating
