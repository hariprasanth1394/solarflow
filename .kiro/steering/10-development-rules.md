# SolarFlow — Development Rules

## Always Do

- Reuse existing components from src/components/ui/.
- Follow design system tokens (var(--token)).
- Validate workflow transitions before stage changes.
- Preserve tenant isolation (.eq("organization_id", orgId)).
- Use withRequestContext for all service functions.
- Invalidate query cache after mutations.
- Log activity for CRUD operations.
- Use assertValidUUID on all entity IDs.
- Test both dark and light mode.
- Test mobile responsiveness (375px minimum).
- Use TypeScript strict types.
- Handle errors: try/catch → log → generic rethrow.
- Use structured logging (logInfo, logError, logWarn).
- Select explicit columns in Supabase queries.

## Never Do

- Create duplicate components that already exist.
- Introduce hardcoded colors (use CSS variables).
- Bypass RBAC or organization scoping.
- Modify workflow stages without updating business rules.
- Use select("*") in Supabase queries.
- Expose internal error details to client responses.
- Import modules/ into components/ (wrong direction).
- Access Supabase directly from UI components.
- Use `any` type without justifying comment.
- Add console.log in production code (use logger).
- Remove activity logging from CRUD operations.
- Skip UUID validation on entity parameters.
- Create API routes for client-side service calls.
- Manually edit database.types.ts (auto-generated).
- Trust client-provided role/org information.
