# SolarFlow — RBAC Rules

## Current State

- No role enforcement. All authenticated users have full access.
- `users.role` column exists (default "member") but never checked.
- Auth: Supabase email/password + Google OAuth.
- Session: cookie sb-access-token with idle timeout 30-60 min.
- Middleware checks cookie existence only (no token validation).

## Target Roles

```
Owner → Admin → Manager → Technician → Viewer
```

## Page Access (Target)

| Page | Owner | Admin | Manager | Tech | Viewer |
|------|:-----:|:-----:|:-------:|:----:|:------:|
| Dashboard | ✅ | ✅ | ✅ | ✅* | ✅ |
| Customers | ✅ | ✅ | ✅ | assigned | read |
| Inventory | ✅ | ✅ | ✅ | consume | read |
| Tasks | ✅ | ✅ | ✅ | assigned | read |
| Documents | ✅ | ✅ | ✅ | upload | read |
| Analytics | ✅ | ✅ | ✅ | ❌ | ✅ |
| Settings | ✅ | ✅ | ❌ | ❌ | ❌ |

## Action Access (Target)

| Action | Owner | Admin | Manager | Tech | Viewer |
|--------|:-----:|:-----:|:-------:|:----:|:------:|
| Create customer | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete customer | ✅ | ✅ | ❌ | ❌ | ❌ |
| Transition stage | ✅ | ✅ | ✅ | ❌ | ❌ |
| Add inventory | ✅ | ✅ | ✅ | ❌ | ❌ |
| Consume inventory | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Billing/Plans | ✅ | ❌ | ❌ | ❌ | ❌ |

## Implementation Path

1. DB: RLS policies per role
2. Service: withRoleCheck(minimumRole) wrapper
3. API: role validation in route handlers
4. UI: RoleGate component for conditional rendering

## AI Rules

- Design new features for future role-gating.
- Add `// TODO: RBAC` where role checks should exist.
- Never trust client-provided role information.
- Org context always from server-side session.
