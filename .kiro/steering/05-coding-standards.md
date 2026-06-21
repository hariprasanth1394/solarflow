# SolarFlow — Coding Standards

## React

- Functional components only. "use client" only when needed.
- Extract logic into services or hooks. useMemo for expensive work.
- Early returns for conditionals. Cleanup effects with return.

## Next.js

- App Router: page.tsx, layout.tsx, route.ts conventions.
- Route groups: (auth), (dashboard). @/ alias for src/.
- Never import server modules in client components.

## TypeScript

- Strict mode. No `any` without comment. Use `unknown` for untyped.
- Prefer `type` over `interface`. DB types auto-generated.

## Supabase Queries

- Always select explicit columns (never select("*")).
- Always include .eq("organization_id", orgId).
- Use handleRepositoryError() for errors.
- .maybeSingle() for nullable lookups. .single() for inserts.
- Limit: 100-200 default, max 5000.

## Service Pattern

```typescript
export async function action(id: string) {
  assertValidUUID(id, "entityId")
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const data = await repoFunction(organizationId, ...)
      invalidateQueryCacheByPrefix(`entity:list:${organizationId}:`)
      await logActivity("Action", "entity", id, { ... })
      logInfo("Done", { service: "name", organizationId, userId })
      return data
    } catch (error) {
      logError("Failed", error, { service: "name", organizationId, userId })
      throw new Error("Operation failed")
    }
  })
}
```

## Folder Organization

- Pages: app/. Features: modules/. Shared UI: components/.
- Logic: services/. Data: repositories/. Infra: lib/.
- Never import modules/ into components/ (flow is downward).

## Error Handling

- Repository: throw RepositoryError(msg, code).
- Service: catch → log → rethrow Error("Operation failed").
- Component: try/catch → error state → user message.
- Non-critical (audit, workflow): catch + log + continue.

## Naming

- Components: PascalCase. Services/utils: camelCase.
- Constants: UPPER_SNAKE. DB: snake_case plural.
- FKs: {table_singular}_id. Handlers: handleX. Async: getX/fetchX.

## Security

- UUID validation on all IDs. Org scoping on every query.
- Generic errors to clients. File validation (type, size, name).
- Cookie auth SameSite=Lax. No secrets in client responses.
