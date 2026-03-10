# SolarFlow Multi-Tenant SaaS Backend (Supabase)

This document corresponds to migration:
- `supabase/migrations/202603040001_multi_tenant_saas.sql`

## 1) Full SQL Schema

Implemented tables:
- `organizations`
- `users` (extends `auth.users`)
- `customers`
- `tasks`
- `documents`
- `suppliers`
- `spares`
- `systems`
- `system_components`
- `stock_transactions`
- `reports`
- `dashboard_widgets`
- `organization_settings`
- `user_settings`
- `activity_logs`

Multi-tenant rule:
- Every business table includes `organization_id`.
- Foreign keys ensure tenant ownership consistency.

## 2) Row Level Security Policies

RLS is enabled on all application tables.

Tenant isolation helper:
- `public.current_user_org_id()` resolves org from `public.users` using `auth.uid()`.

Core policy pattern:
```sql
organization_id = public.current_user_org_id()
```

Applied as `FOR ALL` (`SELECT/INSERT/UPDATE/DELETE`) for tenant tables.
Additional role-based controls:
- `organizations`: update only by `admin`/`manager`.
- `users`: self-update or org admin/manager update.

Storage RLS:
- Bucket `documents` is private.
- File path must start with organization ID:
  - `<organization_id>/<folder>/<filename>`
- `storage.objects` policies enforce path/org match.

## 3) Inventory Calculation SQL

Function:
- `public.calculate_system_inventory_availability(p_organization_id uuid)`

Logic:
```sql
available_systems = min(floor(spares.stock_quantity / system_components.quantity_required))
```

View:
- `public.v_system_inventory_availability` (scoped to current user org).

Returns:
- `system_id`
- `system_name`
- `capacity_kw`
- `available_systems`

## 4) Example Supabase Queries

### Customers
```js
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .order('created_at', { ascending: false })
```

### Tasks (by status)
```js
const { data, error } = await supabase
  .from('tasks')
  .select('id,title,status,priority,due_date')
  .eq('status', 'pending')
```

### Inventory availability view
```js
const { data, error } = await supabase
  .from('v_system_inventory_availability')
  .select('*')
```

### Insert stock transaction
```js
const { data, error } = await supabase
  .from('stock_transactions')
  .insert([{ organization_id, spare_id, type: 'purchase', quantity: 25, reference: 'PO-001' }])
```

## 5) Authentication Flow

Implemented trigger/function:
- `public.handle_new_user()`
- Trigger: `on_auth_user_created` on `auth.users`

On signup:
1. Create `organizations` row.
2. Create `public.users` row linked to auth user.
3. Assign role `admin`.
4. Create `organization_settings`.
5. Create `user_settings`.

Auth features supported by Supabase client:
- Email/password login
- Session retrieval / persistence
- Logout
- Password reset via Supabase auth API

Route protection pattern (frontend middleware/guard):
- If no session => redirect `/login`
- Else allow `/dashboard`, `/customers`, `/tasks`, `/inventory`, `/documents`, `/reports`, `/settings`

## 6) File Upload Example (Supabase Storage)

Bucket:
- `documents`

Path convention:
- `${organizationId}/documents/${Date.now()}-${file.name}`

Example:
```js
const filePath = `${organizationId}/documents/${Date.now()}-${file.name}`

const { data, error } = await supabase
  .storage
  .from('documents')
  .upload(filePath, file)
```

Download example:
```js
const { data, error } = await supabase
  .storage
  .from('documents')
  .download(filePath)
```

---

## Architecture Rule Enforced

`Page -> Service Layer -> Supabase Client -> Database`

Current project service files already align with this pattern:
- `src/services/authService.js`
- `src/services/customerService.js`
- `src/services/taskService.js`
- `src/services/inventoryService.js`
- `src/services/documentService.js`
- `src/services/reportService.js`
- `src/services/settingsService.js`

## Seed Data (Optional)

File:
- `supabase/seed.sql`

What it seeds:
- 1 demo organization
- customer/task/document/inventory/report/settings/widget/activity data
- links the earliest `auth.users` account as org `admin` when available

Run (Supabase SQL Editor):
1. Run migration: `supabase/migrations/202603040001_multi_tenant_saas.sql`
2. Run seed: `supabase/seed.sql`

After seed, query:
```sql
select * from public.v_system_inventory_availability;
```

## RLS Isolation Test (3 Tenants)

File:
- `supabase/rls_isolation_test.sql`

Purpose:
- Validates that users only see their own tenant data (`customers`, `tasks`, `spares`, `documents`).
- Validates cross-tenant update attempts affect `0` rows.

Prerequisites:
1. Migration already applied.
2. Seed data applied.
3. At least 3 users in `public.users` from distinct organizations.

Run:
1. Open Supabase SQL Editor.
2. Execute `supabase/rls_isolation_test.sql`.
3. Review `rls_test_results` output and summary counts.
