# SolarFlow — Project Context

## What Is SolarFlow

Solar ERP/CRM SaaS for solar installation companies. Manages full customer
lifecycle: lead → government approval → installation → closure, with inventory,
tasks, documents, and payments.

## Target Users

- Sales Reps: Customer creation, lead tracking, document uploads
- Operations Managers: Inventory, system availability, task assignment
- Technicians: Installation tasks, component consumption
- Business Owners: Dashboard analytics, financials, settings

## Core Modules

| Module | Purpose |
|--------|---------|
| Customers | 5-stage lifecycle CRM |
| Inventory | Spare parts, solar systems, stock, availability |
| Tasks | Work items linked to customers |
| Documents | Compliance file management |
| Payments | Payment recording per installation |
| Dashboard | KPIs, charts, alerts |
| Analytics | Revenue, margins, pipeline |

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript 5
- Supabase (PostgreSQL + Auth + Storage)
- Tailwind CSS 4 + CSS custom properties
- Recharts, Lucide, ExcelJS/xlsx

## Architecture

```
Pages → Modules → Services → Repositories → Supabase
```

Multi-tenancy via `organization_id`. Auth via cookie session.

## SaaS Roadmap

1. Stabilization (RBAC, testing, payment fix)
2. User management, notifications
3. Configurable workflows, feature flags, customer portal
4. Multi-tenant SaaS (Stripe, onboarding, plans)
5. Enterprise (approvals, audit, API, mobile)
