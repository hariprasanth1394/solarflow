# 12 — Known Issues (Backlog)

## Critical Issues

| # | Issue | Location | Status | Owner | Impact |
|---|-------|----------|--------|-------|--------|
| C1 | No Role-Based Access Control | Entire application | Open | — | Any authenticated user can perform any action including destructive ones |
| C2 | Payment Data Stored in Free-Text Notes | `customerService.ts` → `derivePaymentSnapshot()` | Open | — | Financial data reliability depends on regex parsing of a text field |
| C3 | No Test Coverage | Entire codebase | Open | — | No automated verification of business logic correctness |

### C1 — No Role-Based Access Control
- **Risk**: Data corruption, unauthorized access, compliance failure
- **Fix**: Implement RBAC middleware + UI conditional rendering + RLS policies

### C2 — Payment Data Stored in Free-Text Notes
- **Risk**: Incorrect payment calculations, blocked workflow transitions, data loss on notes edit
- **Fix**: Use dedicated `payments` table aggregation instead of notes parsing

### C3 — No Test Coverage
- **Risk**: Regressions on any code change, especially workflow rules
- **Fix**: Add Vitest + Testing Library + Playwright for critical paths

---

## High Severity Issues

| # | Issue | Location | Status | Owner | Impact |
|---|-------|----------|--------|-------|--------|
| H1 | Dual Status Tracking (status + current_stage) | `customers` table | Open | — | Two overlapping fields create confusion and require complex normalization |
| H2 | Inventory Reserved Before Approval | `customerService.ts` → `createCustomer()` | Open | — | Stock locked for customers who may never get approved |
| H3 | No `updated_at` Timestamps | All database tables | Open | — | Cannot determine when records were last modified |
| H4 | Missing `inventory_movements` Table in Types | `database.types.ts` | Open | — | Code accesses table via `legacySupabase as any` |
| H5 | No Soft Delete | All delete operations | Open | — | Hard deletes remove data permanently |

### H1 — Dual Status Tracking
- **Risk**: Inconsistent state, difficult queries, developer confusion
- **Fix**: Deprecate `status` field, migrate all logic to `current_stage`

### H2 — Inventory Reserved Before Approval
- **Risk**: Stock locked for customers who may never get approved, availability underreported
- **Fix**: Reserve inventory only when transitioning to INSTALLATION stage

### H3 — No `updated_at` Timestamps
- **Risk**: Stale data issues, no audit of modification timing, sync difficulties
- **Fix**: Add `updated_at` column with PostgreSQL trigger

### H4 — Missing `inventory_movements` Table in Types
- **Risk**: Runtime type errors, no compile-time safety for movement queries
- **Fix**: Regenerate Supabase types to include this table

### H5 — No Soft Delete
- **Risk**: Data loss, broken references, no undo capability
- **Fix**: Add `deleted_at` column, filter active records in queries

---

## Medium Severity Issues

| # | Issue | Location | Status | Owner | Impact |
|---|-------|----------|--------|-------|--------|
| M1 | No Input Sanitization for XSS | Customer names, notes, descriptions | Open | — | Stored XSS if malicious content entered |
| M2 | Query Cache Not Distributed | `queryCache.ts` | Open | — | Stale data across serverless instances |
| M3 | No Rate Limiting on API Routes | All API endpoints | Open | — | No protection against abuse or brute force |
| M4 | Session Token Not Validated at Edge | `authMiddleware.ts` | Open | — | Expired tokens reach the page |
| M5 | No Error Boundaries | React component tree | Open | — | Unhandled errors crash entire page |
| M6 | Workflow Evaluation Is Fire-and-Forget | `customerService.ts`, `taskService.ts` | Open | — | Stage transitions silently fail |
| M7 | No Concurrent Transaction Protection | `customerWorkflowService.ts` | Open | — | Data race conditions on transitions |
| M8 | DataTable Exists in TSX and JSX | `components/tables/` | Open | — | Duplicate component, unclear canonical |
| M9 | Login Page Inconsistent with Design System | `modules/login/LoginPage.tsx` | Open | — | Visual inconsistency |

### M1 — No Input Sanitization for XSS
- **Risk**: Security vulnerability — React auto-escapes JSX but notes rendering may not
- **Fix**: Sanitize inputs at service layer, CSP headers

### M2 — Query Cache Not Distributed
- **Risk**: Inconsistent data between concurrent users on different instances
- **Fix**: Use Redis or Supabase realtime subscriptions for cache invalidation

### M3 — No Rate Limiting on API Routes
- **Risk**: DoS attacks, excessive database load
- **Fix**: Add rate limiting middleware (token bucket or sliding window)

### M4 — Session Token Not Validated at Edge
- **Risk**: Expired tokens reach the page before being caught by client-side check
- **Fix**: Validate JWT expiry in middleware

### M5 — No Error Boundaries
- **Risk**: Poor user experience on partial failures
- **Fix**: Add React Error Boundaries at layout and module levels

### M6 — Workflow Evaluation Is Fire-and-Forget
- **Risk**: Stage transitions silently fail, users don't know workflow didn't advance
- **Fix**: Return workflow evaluation result to caller, show notification on failure

### M7 — No Concurrent Transaction Protection
- **Risk**: Data race conditions, invalid state
- **Fix**: Optimistic locking (version column) or database-level row locks

### M8 — DataTable Exists in TSX and JSX
- **Risk**: Inconsistent behavior, wasted maintenance
- **Fix**: Remove JSX version, consolidate to TypeScript

### M9 — Login Page Inconsistent with Design System
- **Risk**: Visual inconsistency, reduced premium feel
- **Fix**: Apply design system tokens to login page

---

## Low Severity Issues

| # | Issue | Location | Status | Owner | Impact |
|---|-------|----------|--------|-------|--------|
| L1 | No Database Enums | All status/stage/type columns | Open | — | Free-text strings instead of constrained values |
| L2 | No Pagination on Several List Views | Various service calls | Open | — | Fetches all records up to a limit |
| L3 | Console.log Statements in Production Code | `authService.ts`, `AuthSessionSync.tsx` | Open | — | Debug logs visible in production |
| L4 | No Image Optimization for Dynamic Content | Document viewing, user avatars | Open | — | Full-size images loaded |
| L5 | Missing Accessibility Labels | Various interactive elements | Open | — | Screen readers may not describe functionality |
| L6 | No Loading Skeletons | Most list pages | Open | — | Blank content during data fetch |
| L7 | `useAuth` Hook is JavaScript (.js) | `src/hooks/useAuth.js` | Open | — | No type safety in auth hook |

---

## Architecture Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Data breach (no RBAC) | High | Critical | Implement RBAC immediately |
| Financial data corruption (notes parsing) | Medium | High | Migrate to proper payment tracking |
| Scalability ceiling (in-memory cache) | Medium | Medium | Distributed cache (Redis) |
| Vendor lock-in (Supabase) | Low | High | Abstract data layer behind interfaces |
| Single point of failure (no redundancy) | Medium | High | Multi-region deployment |

---

## Security Concerns

| Concern | Status | Recommendation |
|---------|--------|----------------|
| RBAC | ❌ Missing | Implement before production |
| Input validation | ⚠️ Partial | Add schema validation (Zod) |
| Rate limiting | ❌ Missing | Add to API routes |
| CSP headers | ❌ Missing | Configure in next.config.ts |
| CORS | ⚠️ Default | Review and restrict |
| SQL injection | ✅ Protected | Supabase query builder prevents |
| XSS | ⚠️ React handles | Audit dangerouslySetInnerHTML usage |
| CSRF | ⚠️ Cookie SameSite | Add CSRF tokens for mutations |

---

## Performance Concerns

| Concern | Current State | Impact |
|---------|--------------|--------|
| No CDN for assets | Static files served by Next.js | Slower global access |
| No image optimization | Full-size images | Bandwidth waste |
| Client-side data fetching | All pages fetch on mount | No SSR/SSG benefits |
| In-memory cache only | Lost on redeploy/new instance | Cache misses |
| No database indexes documented | Unknown index coverage | Potential slow queries |
| No bundle analysis | Unknown bundle size | Potential large initial load |
