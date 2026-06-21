# SolarFlow — Database Rules

## Tenant Isolation

- Every table has organization_id FK → organizations.id.
- Every query MUST include .eq("organization_id", orgId).
- Cross-org access architecturally impossible.

## Naming Conventions

- Tables: snake_case plural (customers, stock_transactions)
- Columns: snake_case (organization_id, created_at)
- FKs: {table_singular}_id (customer_id, spare_id)
- PKs: always `id` (UUID auto-generated)
- Timestamps: created_at required, updated_at recommended
- Booleans: descriptive (submission_completed)
- JSON: _json suffix (settings_json)

## Schema Rules

- All PKs UUID via gen_random_uuid().
- created_at defaults to now() on every table.
- Select explicit columns (never select("*")).
- Foreign keys MUST define ON DELETE behavior.
- No nullable FKs without business justification.

## Required Indexes (Gaps to Address)

- customers(organization_id, current_stage)
- customers(organization_id, created_at DESC)
- tasks(organization_id, related_customer_id)
- tasks(organization_id, assigned_to)
- documents(organization_id, related_customer_id)
- spares(organization_id, spare_code)
- stock_transactions(organization_id, spare_id, created_at)
- activity_logs(organization_id, entity_type, entity_id)
- customer_progress(customer_id, created_at DESC)

## RLS (Target — Not Yet Implemented)

- All tables: organization_id = current_user_org_id()
- Service role bypasses RLS for system operations.

## Known Debt

- inventory_movements table not in generated types (accessed as any)
- customers.status overlaps current_stage — deprecate status
- No updated_at columns anywhere
- No soft delete (all hard deletes)
- Payment status derived from notes parsing (should use payments table)
