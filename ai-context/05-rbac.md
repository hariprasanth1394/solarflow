# 05 — Authentication & RBAC

## Current Authentication Implementation

### Authentication Flow

```
User → Login Page → Supabase Auth (email/password or Google OAuth)
                         ↓
                   Access Token returned
                         ↓
              Cookie set (sb-access-token)
                         ↓
         AuthSessionSync monitors session state
                         ↓
           Middleware checks cookie on protected routes
                         ↓
        Services resolve org context from token
```

### Login Methods

| Method | Implementation |
|--------|---------------|
| Email/Password | `supabase.auth.signInWithPassword()` |
| Google OAuth | `supabase.auth.signInWithOAuth({ provider: 'google' })` |
| Sign Up | `supabase.auth.signUp()` with metadata (name) |

### Session Management

**Client-Side (`AuthSessionSync.tsx`)**:
- Runs in root layout as a client component
- On mount: calls `supabase.auth.getSession()` → sets cookie
- Listens to `onAuthStateChange` → updates cookie on token refresh
- Monitors user activity (click, keydown, mousemove, scroll, touch)
- Idle timeout: configurable 30–60 minutes (default 45 min)
- On timeout: calls `supabase.auth.signOut()`, clears cookie, redirects to login

**Middleware (`authMiddleware.ts`)**:
- Runs on every protected route request
- Checks for `sb-access-token` cookie OR Supabase auth pattern cookies
- If missing: redirects to `/login?redirect=<current-path>`
- If present: allows request through (no token validation at edge)

**Server-Side Context (`orgContext.ts`)**:
- Called by all service functions via `withRequestContext`
- Reads access token from `next/headers` cookies
- Creates request-scoped Supabase client with token in Authorization header
- Calls `supabase.auth.getUser(token)` to validate and extract user
- Looks up `organization_id` from `users` table
- Falls back to `current_user_org_id()` RPC if not found
- Caches context for 2 seconds to avoid repeated auth calls

### Protected Routes

```
/dashboard, /customers, /inventory, /analytics, /estimator,
/tasks, /documents, /reports, /settings, /notifications
```

### Cookie Structure

| Cookie | Purpose | Lifetime |
|--------|---------|----------|
| `sb-access-token` | Carries JWT for API route authentication | Session (cleared on logout/timeout) |

---

## Current Authorization Flow

### Current State: NO AUTHORIZATION

The application currently has **no role-based access control**. All authenticated users have identical permissions:
- Access all pages
- Create/read/update/delete all entities
- View all organization data
- Perform all actions

The `users.role` column exists in the database (default: 'member') but is **never checked** in any service, middleware, or UI component.

### Current Roles (Database Only)

| Role | Stored In | Enforced | Description |
|------|-----------|----------|-------------|
| member | `users.role` | ❌ No | Default role for all users |

### Current Page Access

| Page | Access | Restriction |
|------|--------|-------------|
| All dashboard pages | Any authenticated user | None beyond authentication |

---

## Recommended RBAC Architecture

### Proposed Role Hierarchy

```
Super Admin → Full system access, multi-org management
    ↓
Admin → Full org access, user management, settings
    ↓
Manager → Customer lifecycle, inventory, reports, task assignment
    ↓
Technician → Assigned tasks, inventory consumption, document upload
    ↓
Viewer → Read-only access to dashboards and reports
```

### Role Definitions

#### Super Admin
- **Scope**: Platform-wide (cross-organization)
- **Allowed Pages**: All pages + admin panel
- **Allowed Actions**: Everything + org creation, user role assignment, plan management
- **Restricted Actions**: None

#### Admin
- **Scope**: Single organization
- **Allowed Pages**: All pages within organization
- **Allowed Actions**: User management, settings, all CRUD, workflow override
- **Restricted Actions**: Cross-org access, platform settings

#### Manager
- **Scope**: Single organization
- **Allowed Pages**: Dashboard, Customers, Inventory, Tasks, Documents, Analytics, Reports
- **Allowed Actions**: Customer CRUD, task assignment, inventory management, report generation, workflow transitions
- **Restricted Actions**: User management, organization settings, role changes

#### Technician
- **Scope**: Assigned entities only
- **Allowed Pages**: Dashboard (limited), Tasks, Inventory (limited), Documents
- **Allowed Actions**: View assigned tasks, update task status, consume inventory, upload documents
- **Restricted Actions**: Customer creation/deletion, inventory purchasing, financial data, settings

#### Viewer
- **Scope**: Read-only within organization
- **Allowed Pages**: Dashboard, Customers (read), Inventory (read), Reports (read)
- **Allowed Actions**: View data, download reports, export data
- **Restricted Actions**: All create/update/delete operations

---

### Permission Matrix

| Permission | Super Admin | Admin | Manager | Technician | Viewer |
|------------|:-----------:|:-----:|:-------:|:----------:|:------:|
| **Customers** |
| Create customer | ✅ | ✅ | ✅ | ❌ | ❌ |
| View all customers | ✅ | ✅ | ✅ | ❌ | ✅ |
| View assigned customers | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit customer | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete customer | ✅ | ✅ | ❌ | ❌ | ❌ |
| Transition workflow stage | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Inventory** |
| View inventory | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add spare parts | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit stock levels | ✅ | ✅ | ✅ | ❌ | ❌ |
| Consume inventory | ✅ | ✅ | ✅ | ✅ | ❌ |
| Import/Export | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Tasks** |
| View all tasks | ✅ | ✅ | ✅ | ❌ | ✅ |
| View assigned tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create task | ✅ | ✅ | ✅ | ❌ | ❌ |
| Assign task | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update task status | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete task | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Documents** |
| View documents | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload document | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete document | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Settings** |
| View settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Modify settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Analytics/Reports** |
| View dashboard | ✅ | ✅ | ✅ | ✅ (limited) | ✅ |
| View financial data | ✅ | ✅ | ✅ | ❌ | ✅ |
| Generate reports | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Payments** |
| View payments | ✅ | ✅ | ✅ | ❌ | ✅ |
| Record payment | ✅ | ✅ | ✅ | ❌ | ❌ |

---

### Implementation Recommendations

1. **Database**: Add `permissions` table or use Supabase RLS policies per role
2. **Middleware**: Create `withRoleCheck(requiredRole)` wrapper for services
3. **UI**: Conditional rendering based on user role from context
4. **API Routes**: Validate role before executing business logic
5. **Supabase RLS**: Enforce at database level as defense-in-depth
