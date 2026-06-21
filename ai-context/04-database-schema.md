# 04 — Database Schema

## Overview

SolarFlow uses **Supabase (PostgreSQL)** with 16 tables, 1 view, and 3 database functions. All tables use UUID primary keys and enforce multi-tenancy via `organization_id` foreign keys.

---

## Entity Relationship Diagram (Textual)

```
organizations (1) ─── (N) users
organizations (1) ─── (N) customers
organizations (1) ─── (N) tasks
organizations (1) ─── (N) documents
organizations (1) ─── (N) spares
organizations (1) ─── (N) systems
organizations (1) ─── (N) suppliers
organizations (1) ─── (N) stock_transactions
organizations (1) ─── (N) reports
organizations (1) ─── (N) activity_logs
organizations (1) ─── (N) dashboard_widgets
organizations (1) ─── (1) organization_settings

customers (1) ─── (N) customer_progress
customers (1) ─── (N) tasks (via related_customer_id)
customers (1) ─── (N) documents (via related_customer_id)
customers (1) ─── (N) payments (via installation_id)
customers (N) ─── (1) systems (via system_id)
customers (N) ─── (1) users (via assigned_to)

systems (1) ─── (N) system_components
spares (1) ─── (N) system_components
spares (1) ─── (N) stock_transactions
spares (N) ─── (1) suppliers

users (1) ─── (1) user_settings
users (1) ─── (N) tasks (via assigned_to, created_by)
users (1) ─── (N) documents (via uploaded_by)
users (1) ─── (N) reports (via generated_by)
users (1) ─── (N) activity_logs (via user_id)
users (1) ─── (N) customer_progress (via changed_by)
```

---

## Tables

### `organizations`
Central tenant entity. All data is scoped to an organization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | Unique organization identifier |
| name | text | NOT NULL | Organization display name |
| industry | text | nullable | Industry classification |
| logo_url | text | nullable | Organization logo URL |
| plan | text | nullable | Subscription plan tier |
| created_at | timestamptz | default now() | Creation timestamp |

---

### `users`
Application users belonging to an organization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Matches Supabase Auth user ID |
| organization_id | uuid | FK → organizations.id, NOT NULL | Tenant scoping |
| name | text | nullable | Display name |
| email | text | nullable | Email address |
| role | text | default 'member' | User role (not yet enforced) |
| status | text | default 'active' | Account status |
| avatar_url | text | nullable | Profile image URL |
| created_at | timestamptz | default now() | Creation timestamp |

---

### `customers`
Core CRM entity representing solar installation customers/projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | Customer identifier |
| organization_id | uuid | FK → organizations.id, NOT NULL | Tenant scoping |
| name | text | NOT NULL | Customer full name |
| phone | text | nullable | Phone number |
| email | text | nullable | Email address |
| company | text | nullable | Company name |
| address | text | nullable | Street address |
| city | text | nullable | City |
| state | text | nullable | State/province |
| country | text | nullable | Country |
| assigned_to | uuid | FK → users.id, nullable | Sales representative |
| status | text | default 'Active' | Legacy status field |
| current_stage | text | default 'CREATED' | Workflow stage (CREATED/SUBMITTED/APPROVED/INSTALLATION/CLOSED) |
| system_id | uuid | FK → systems.id, nullable | Assigned solar system |
| total_cost | numeric | nullable | Total project cost |
| paid_amount | numeric | default 0 | Amount paid |
| pending_amount | numeric | default 0 | Outstanding balance |
| payment_status | text | nullable | Payment status (Pending/Partial/Paid) |
| submission_completed | boolean | default false | Government submission done |
| approval_completed | boolean | default false | Government approval received |
| installation_completed | boolean | default false | Physical installation done |
| closure_completed | boolean | default false | Project closure done |
| notes | text | nullable | Free-text notes |
| created_at | timestamptz | default now() | Creation timestamp |

**Relationships**: organizations, users (assigned_to), systems (system_id)

---

### `customer_progress`
Workflow stage transition history for customers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | Progress entry ID |
| organization_id | uuid | FK → organizations.id, NOT NULL | Tenant scoping |
| customer_id | uuid | FK → customers.id, NOT NULL | Related customer |
| previous_stage | text | nullable | Stage before transition |
| current_stage | text | NOT NULL | Stage after transition |
| trigger_event | text | NOT NULL | What caused the transition |
| next_required_action | text | nullable | What should happen next |
| metadata | jsonb | default '{}' | Additional context data |
| changed_by | uuid | FK → users.id, nullable | User who triggered change |
| created_at | timestamptz | default now() | Transition timestamp |

---

### `tasks`
Work items assignable to users, optionally linked to customers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | Task identifier |
| organization_id | uuid | FK → organizations.id, NOT NULL | Tenant scoping |
| title | text | NOT NULL | Task title |
| description | text | nullable | Task description |
| status | text | default 'Pending' | Task status |
| priority | text | default 'Medium' | Priority level |
| due_date | timestamptz | nullable | Due date |
| assigned_to | uuid | FK → users.id, nullable | Assigned user |
| created_by | uuid | FK → users.id, nullable | Creator |
| related_customer_id | uuid | FK → customers.id, nullable | Linked customer |
| created_at | timestamptz | default now() | Creation timestamp |

---

### `documents`
File metadata for uploaded documents.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | Document ID |
| organization_id | uuid | FK → organizations.id, NOT NULL | Tenant scoping |
| name | text | NOT NULL | File display name |
| file_url | text | NOT NULL | Storage path in Supabase |
| file_type | text | nullable | MIME type |
| file_size | integer | nullable | File size in bytes |
| related_customer_id | uuid | FK → customers.id, nullable | Linked customer |
| uploaded_by | uuid | FK → users.id, nullable | Uploader |
| created_at | timestamptz | default now() | Upload timestamp |

---

### `systems`
Solar system configurations (e.g., "5kW Residential System").

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | System identifier |
| organization_id | uuid | FK → organizations.id, NOT NULL | Tenant scoping |
| system_name | text | NOT NULL | System display name |
| capacity_kw | numeric | NOT NULL | System capacity in kilowatts |
| description | text | nullable | System description |
| created_at | timestamptz | default now() | Creation timestamp |

---

### `system_components`
Bill of materials — links systems to required spare parts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | Component link ID |
| organization_id | uuid | FK → organizations.id, NOT NULL | Tenant scoping |
| system_id | uuid | FK → systems.id, NOT NULL | Parent system |
| spare_id | uuid | FK → spares.id, NOT NULL | Required spare part |
| quantity_required | integer | NOT NULL | Quantity needed per system |
| created_at | timestamptz | default now() | Creation timestamp |

---

### `spares`
Solar components and spare parts inventory.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | Spare part ID |
| organization_id | uuid | FK → organizations.id, NOT NULL | Tenant scoping |
| name | text | NOT NULL | Part name |
| spare_code | text | default '' | SKU/part code |
| category | text | nullable | Category (Panel, Inverter, etc.) |
| stock_quantity | integer | default 0 | Current stock level |
| min_stock | integer | default 0 | Minimum stock threshold |
| cost_price | numeric | default 0 | Unit cost price |
| unit | text | nullable | Unit of measure (pcs, m, kg) |
| supplier_id | uuid | FK → suppliers.id, nullable | Default supplier |
| created_at | timestamptz | default now() | Creation timestamp |

---

### `suppliers`
Component supplier information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | Supplier ID |
| organization_id | uuid | FK → organizations.id, NOT NULL | Tenant scoping |
| name | text | NOT NULL | Supplier name |
| contact | text | nullable | Contact person |
| email | text | nullable | Email address |
| phone | text | nullable | Phone number |
| created_at | timestamptz | default now() | Creation timestamp |

---

### `stock_transactions`
Stock movement ledger for spare parts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | Transaction ID |
| organization_id | uuid | FK → organizations.id, NOT NULL | Tenant scoping |
| spare_id | uuid | FK → spares.id, NOT NULL | Affected spare part |
| type | text | NOT NULL | Transaction type (reserve/release/consume/purchase/adjustment) |
| quantity | integer | NOT NULL | Quantity (positive or negative) |
| reference | text | nullable | Context reference (e.g., "reserve:customer-id") |
| created_at | timestamptz | default now() | Transaction timestamp |

---

### `payments`
Payment records linked to customer installations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | Payment ID |
| organization_id | uuid | FK (implicit) | Tenant scoping |
| installation_id | uuid | FK → customers.id, NOT NULL | Customer/installation |
| amount | numeric | NOT NULL | Payment amount |
| payment_date | text | NOT NULL | Date of payment |
| payment_method | text | default 'Unknown' | Payment method |
| notes | text | nullable | Payment notes |
| created_at | timestamptz | default now() | Record timestamp |

---

### `reports`
Generated report metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | Report ID |
| organization_id | uuid | FK → organizations.id, NOT NULL | Tenant scoping |
| name | text | NOT NULL | Report name |
| report_type | text | NOT NULL | Report category |
| file_url | text | nullable | Generated file path |
| generated_by | uuid | FK → users.id, nullable | Generator |
| created_at | timestamptz | default now() | Generation timestamp |

---

### `activity_logs`
Audit trail for entity-level actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | Log entry ID |
| organization_id | uuid | FK → organizations.id, NOT NULL | Tenant scoping |
| action | text | NOT NULL | Action description |
| entity_type | text | nullable | Entity type (customer, task, document) |
| entity_id | uuid | nullable | Entity identifier |
| user_id | uuid | FK → users.id, nullable | Acting user |
| details | jsonb | default '{}' | Action context |
| created_at | timestamptz | default now() | Action timestamp |

---

### `dashboard_widgets`
User-configurable dashboard widget settings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | Widget ID |
| organization_id | uuid | FK → organizations.id, NOT NULL | Tenant scoping |
| widget_name | text | NOT NULL | Widget display name |
| widget_type | text | NOT NULL | Widget type identifier |
| settings_json | jsonb | default '{}' | Widget configuration |
| created_at | timestamptz | default now() | Creation timestamp |

---

### `organization_settings`
Per-organization configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | Settings ID |
| organization_id | uuid | FK → organizations.id, UNIQUE | One per org |
| company_name | text | nullable | Display company name |
| logo_url | text | nullable | Organization logo |
| currency | text | nullable | Default currency |
| timezone | text | nullable | Default timezone |
| language | text | nullable | Default language |
| created_at | timestamptz | default now() | Creation timestamp |

---

### `user_settings`
Per-user preferences.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen | Settings ID |
| organization_id | uuid | FK → organizations.id, NOT NULL | Tenant scoping |
| user_id | uuid | FK → users.id, UNIQUE | One per user |
| theme | text | nullable | UI theme preference |
| notifications_enabled | boolean | default true | Notification toggle |
| created_at | timestamptz | default now() | Creation timestamp |

---

## Views

### `v_system_inventory_availability`
Pre-computed view showing how many of each system can be built from current stock.

| Column | Type | Description |
|--------|------|-------------|
| system_id | uuid | System identifier |
| system_name | text | System name |
| capacity_kw | numeric | System capacity |
| available_systems | integer | Number buildable from stock |

---

## Database Functions

| Function | Args | Returns | Purpose |
|----------|------|---------|---------|
| `calculate_system_inventory_availability` | `p_organization_id: uuid` | Table (system_id, system_name, capacity_kw, available_systems) | Compute system availability from stock |
| `current_user_org_id` | none | uuid | Get authenticated user's organization ID |
| `current_user_role` | none | text | Get authenticated user's role |

---

## Technical Debt & Missing Relationships

| Issue | Severity | Description |
|-------|----------|-------------|
| No `inventory_movements` table in types | Medium | Code references this table but it's not in generated types — may use legacy/untyped access |
| `payments.organization_id` not FK-constrained | Low | Column exists but no declared relationship in types |
| No indexes documented | Medium | Performance indexes likely exist but not captured in type generation |
| No enums | Low | Status fields use free-text strings instead of PostgreSQL enums |
| `customers.status` vs `customers.current_stage` | High | Dual status tracking creates confusion — code normalizes both |
| No soft delete | Medium | Hard deletes used everywhere — no `deleted_at` column |
| No `updated_at` columns | Medium | Only `created_at` tracked — no modification timestamps |

---

## Tenant Isolation Strategy

All data isolation is enforced via `organization_id` column present on every table. Every query in the repository layer includes `.eq("organization_id", orgId)`.

### Current Enforcement
- **Application Layer**: All service functions resolve `organizationId` from authenticated session via `withRequestContext`
- **Repository Layer**: Every query explicitly filters by `organization_id`
- **No RLS Policies**: Currently no Supabase Row Level Security policies are configured (HIGH RISK)

### Recommended RLS Implementation
```sql
-- Example for customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON customers
  USING (organization_id = current_setting('app.current_organization_id')::uuid);
```

---

## Flags: Schema Health Issues

| Issue | Severity | Table | Description |
|-------|----------|-------|-------------|
| No RLS policies | Critical | All tables | Data isolation relies solely on application code |
| Missing `updated_at` | High | All tables | No modification timestamp tracking |
| No indexes on `organization_id` | Medium | All tables | Performance risk as data grows |
| `inventory_movements` untyped | Medium | — | Referenced in code but missing from generated types |
| No composite indexes | Medium | customers | `(organization_id, current_stage)` would improve filtered queries |
| No check constraints on stages | Low | customers | `current_stage` accepts any text value |
| `payments.organization_id` no FK | Low | payments | Column exists but no declared foreign key constraint |
