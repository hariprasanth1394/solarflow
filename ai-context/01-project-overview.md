# 01 — Project Overview

## Executive Summary

SolarFlow is a Solar ERP/CRM SaaS platform built for solar installation companies. It manages the full customer lifecycle from lead creation through government approval, installation, and project closure — alongside inventory management, task tracking, document handling, and financial oversight.

## Product Vision

A unified, intelligent platform that enables solar companies to manage their entire operation — customers, inventory, documents, installations, and payments — from a single dashboard, replacing fragmented spreadsheets and disconnected tools.

## Product Purpose

SolarFlow exists to solve the operational complexity faced by solar installation businesses:
- Tracking customer projects across multiple approval stages
- Managing solar component inventory with real-time availability
- Coordinating tasks across sales, installation, and admin teams
- Maintaining compliance documents through government approval workflows
- Monitoring payment collection and financial status

## Target Users

| Role | Usage |
|------|-------|
| Sales Representatives | Customer creation, lead tracking, document uploads |
| Operations Managers | Inventory oversight, system availability, task assignment |
| Installers / Technicians | Installation task tracking, component consumption |
| Business Owners / Admins | Dashboard analytics, financial reporting, settings |

## Current Features

### Customer Management
- Full CRUD with multi-step creation wizard
- 5-stage workflow: Created → Submitted → Approved → Installation → Closed
- Workflow stage validation with transition rules
- Payment tracking (total, paid, pending, status)
- Activity log per customer
- Assignable sales representatives

### Inventory Management
- Spare parts catalog with stock levels and minimum thresholds
- Solar system builder (systems composed of spare components)
- Real-time system availability calculation
- Stock transactions (reserve, release, consume, purchase, adjustment)
- Supplier management
- Excel import/export for bulk operations
- Low stock alerts

### Task Management
- Task creation with priority, due date, and assignment
- Customer-linked tasks
- Status tracking with workflow trigger on completion

### Document Management
- File upload with type/size validation (PDF, images, Word, max 10MB)
- Customer-linked documents for workflow progression
- Supabase Storage integration

### Authentication & Security
- Email/password login
- Google OAuth
- Cookie-based session management with idle timeout
- Protected route middleware

### Dashboard & Analytics
- Summary statistics (customers, tasks, inventory, systems)
- Task status chart (bar)
- Inventory stock trends (area)
- Inventory alerts panel
- AI Insights panel

### Additional Modules
- Solar Estimator tool
- Reports generation
- Notifications page
- Settings and user profile

## Business Goals

1. **Operational Efficiency** — Reduce manual tracking, automate workflow progression
2. **Inventory Accuracy** — Real-time visibility into component availability
3. **Compliance Readiness** — Document management aligned with government approval stages
4. **Financial Visibility** — Payment status tracking across all customer projects
5. **SaaS Scalability** — Multi-tenant architecture ready for organizational growth

## Current Limitations

| Area | Limitation |
|------|-----------|
| RBAC | No role-based access control — all authenticated users have full access |
| Notifications | Page exists but no real-time push/email notifications implemented |
| Reports | Basic structure — no scheduled/automated report generation |
| Multi-Tenancy | Organization scoping works, but no tenant onboarding flow |
| Offline | No offline support or PWA capabilities |
| Testing | No test framework or test coverage |
| CI/CD | No deployment pipeline configured |
| Search | Client-side only, no server-side full-text search |
| Audit | Activity logs exist but no compliance-grade audit trail |

## Future Opportunities

- **Role-Based Access Control** — Admin, Manager, Technician, Viewer roles
- **Real-time Notifications** — Push, email, and in-app alerts
- **Workflow Builder** — Configurable stages per organization
- **Customer Portal** — Self-service project status for end customers
- **Mobile App** — React Native companion for field technicians
- **Multi-Tenant SaaS** — Subscription billing, organization onboarding
- **API Marketplace** — Third-party integrations (accounting, CRM, mapping)
- **Advanced Analytics** — Custom reports, export, scheduled generation

## Core Modules

| Module | Purpose |
|--------|---------|
| Customers | CRM with 5-stage lifecycle management |
| Inventory | Solar component and system management |
| Tasks | Work item tracking with assignments |
| Documents | File management for compliance documents |
| Dashboard | Operational overview with KPIs |
| Analytics | Financial and operational dashboards |
| Estimator | Solar system estimation tool |
| Settings | Organization and user configuration |
