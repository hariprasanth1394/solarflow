# 13 — Feature Roadmap

## Phase 1 — Product Stabilization (Current Priority)

Focus: Fix critical issues and establish quality baseline.

### Security & Access Control
- [ ] Implement Role-Based Access Control (RBAC)
  - Database: roles table, permissions table, RLS policies
  - Middleware: role validation wrapper
  - UI: conditional rendering per role
  - Roles: Admin, Manager, Technician, Viewer
- [ ] Add rate limiting to API routes
- [ ] Validate JWT expiry in edge middleware
- [ ] Add Content Security Policy headers
- [ ] Input sanitization at service layer

### Data Integrity
- [ ] Migrate payment tracking from notes parsing to `payments` table aggregation
- [ ] Add `updated_at` columns with auto-update triggers
- [ ] Implement soft delete (`deleted_at`) across all entities
- [ ] Deprecate `customers.status` field — unify on `current_stage`
- [ ] Add database enums for status/stage/type columns
- [ ] Regenerate Supabase types to include `inventory_movements`

### Quality & Testing
- [ ] Set up Vitest for unit testing
- [ ] Add tests for workflow transition rules
- [ ] Add tests for payment calculation logic
- [ ] Set up Playwright for E2E critical paths
- [ ] Add React Error Boundaries
- [ ] Remove console.log from production code
- [ ] Convert `useAuth.js` to TypeScript

### Performance
- [ ] Add skeleton loaders to all list pages
- [ ] Implement proper pagination (cursor-based)
- [ ] Bundle size analysis and optimization
- [ ] Image optimization for dynamic content

---

## Phase 2 — User Management & Notifications

Focus: Multi-user collaboration and communication.

### User Management
- [ ] User invitation flow (admin invites by email)
- [ ] User list page with role assignment
- [ ] User deactivation (not delete)
- [ ] User profile editing (name, avatar, password change)
- [ ] Last login tracking

### RBAC Enforcement
- [ ] Permission matrix enforcement across all services
- [ ] Supabase RLS policies per role
- [ ] UI component-level permission checks
- [ ] API route-level role validation
- [ ] Audit log for permission-related actions

### Notifications
- [ ] In-app notification system (bell icon + dropdown)
- [ ] Notification types: task assignment, stage change, low stock, payment received
- [ ] Real-time via Supabase Realtime subscriptions
- [ ] Email notifications (transactional)
- [ ] Notification preferences per user
- [ ] Read/unread status tracking

### Profile & Settings
- [ ] Organization settings (currency, timezone, branding)
- [ ] User theme preference persistence (server-side)
- [ ] Two-factor authentication (2FA)
- [ ] Session management (view active sessions, force logout)

---

## Phase 3 — Workflow Engine & Customer Portal

Focus: Configurable workflows and customer-facing features.

### Configurable Workflow Builder
- [ ] Admin UI to define workflow stages per organization
- [ ] Custom stage names and descriptions
- [ ] Configurable transition rules (required documents, approvals)
- [ ] Stage-specific task templates (auto-create tasks on stage entry)
- [ ] Parallel stages support (optional)
- [ ] Stage deadlines and SLA tracking

### Advanced Workflow Features
- [ ] Approval workflows (require manager sign-off for transitions)
- [ ] Automated notifications on stage transitions
- [ ] Stage-based document requirements (checklist)
- [ ] Workflow rollback with audit trail
- [ ] Optimistic locking for concurrent transition protection

### Customer Portal
- [ ] Customer-facing read-only view of their project status
- [ ] Document upload by customers (submission forms)
- [ ] Payment history view for customers
- [ ] Stage progress visualization
- [ ] Branded portal per organization (logo, colors)
- [ ] Magic link authentication (no password for customers)

### Enhanced Document Management
- [ ] Document categories and tagging
- [ ] Version history per document
- [ ] Document templates (auto-fill from customer data)
- [ ] Digital signatures integration
- [ ] Document expiry alerts (certifications)

---

## Phase 4 — Multi-Tenant SaaS Platform

Focus: Scale from single-org to multi-tenant SaaS.

### Multi-Tenancy
- [ ] Organization onboarding flow (sign up → create org)
- [ ] Org-level subdomain or slug (solarflow.app/org-name)
- [ ] Data isolation verification and testing
- [ ] Organization branding (logo, colors, email templates)
- [ ] Organization-level feature flags

### Subscription & Billing
- [ ] Stripe integration for subscription billing
- [ ] Plan tiers: Free, Pro, Enterprise
- [ ] Usage-based limits (customers, users, storage)
- [ ] Billing dashboard (invoices, payment methods)
- [ ] Trial period with auto-conversion
- [ ] Plan upgrade/downgrade flows

### White Label
- [ ] Custom domain support per organization
- [ ] Custom branding (login page, emails, portal)
- [ ] Removable SolarFlow branding on enterprise plan
- [ ] Custom email sender domain
- [ ] White-label documentation

### Advanced Inventory
- [ ] Purchase order management
- [ ] Supplier portal (submit quotes, delivery tracking)
- [ ] Barcode/QR code scanning for stock
- [ ] Warehouse location tracking
- [ ] Automated reorder points (purchase suggestions)
- [ ] Inventory valuation reports (FIFO/LIFO)

---

## Phase 5 — Enterprise Features

Focus: Enterprise-grade capabilities for large organizations.

### Advanced Reporting & Analytics
- [ ] Custom report builder (drag-and-drop)
- [ ] Scheduled report generation (daily/weekly/monthly)
- [ ] Report export (PDF, Excel, CSV)
- [ ] Financial dashboards (revenue, costs, margins per project)
- [ ] Performance KPIs per user/team
- [ ] Trend analysis and forecasting

### Approval Workflows
- [ ] Multi-level approval chains
- [ ] Approval delegation (out of office)
- [ ] Approval deadlines with escalation
- [ ] Bulk approvals
- [ ] Mobile approval notifications

### Audit & Compliance
- [ ] Compliance-grade audit trail (immutable)
- [ ] Audit log search and filtering
- [ ] Data retention policies
- [ ] GDPR compliance tools (data export, right to delete)
- [ ] Audit reports for external compliance

### API Marketplace & Integrations
- [ ] Public REST API with API key management
- [ ] Webhook subscriptions (stage changes, payments, stock alerts)
- [ ] Accounting integration (Tally, QuickBooks, Zoho Books)
- [ ] CRM integration (Salesforce, HubSpot)
- [ ] Mapping integration (Google Maps for installation tracking)
- [ ] SMS integration (Twilio for customer notifications)
- [ ] WhatsApp Business integration

### Mobile Application
- [ ] React Native companion app
- [ ] Field technician features (task updates, photo capture)
- [ ] Offline capability with sync
- [ ] Push notifications
- [ ] Barcode scanner for inventory

### AI & Automation
- [ ] AI-powered project estimation (based on historical data)
- [ ] Predictive stock alerts (ML-based demand forecasting)
- [ ] Automated document classification
- [ ] Smart task assignment (workload balancing)
- [ ] Natural language search across all entities
- [ ] Anomaly detection (unusual payment patterns, stock discrepancies)

---

## SaaS Scaling Opportunities

| Opportunity | Phase | Revenue Impact |
|-------------|-------|---------------|
| Subscription billing | 4 | Recurring revenue base |
| White label | 4 | Premium pricing for enterprise |
| API marketplace | 5 | Platform ecosystem revenue |
| Customer portal | 3 | Customer retention + upsell |
| Multi-tenant | 4 | Horizontal scaling |
| Mobile app | 5 | Expanded user base |
| AI features | 5 | Premium tier differentiator |
