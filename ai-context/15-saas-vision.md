# 15 — SaaS Vision (12–24 Month Direction)

## Product Positioning

SolarFlow is evolving from a single-organization solar CRM into a **multi-tenant Solar ERP SaaS platform**. The product will be offered in progressive tiers:

### Tier Architecture

| Tier | Name | Features | Target |
|------|------|----------|--------|
| 1 | Customer Tracker | Customer management, basic workflow | Solo installers |
| 2 | Solar CRM | + Tasks, Documents, Inventory | Small teams (2–10) |
| 3 | Solar CRM + Workflow | + Configurable stages, approvals, notifications | Mid-size (10–50) |
| 4 | Full Solar ERP | + Multi-org, billing, API, reporting, portal | Enterprise (50+) |

---

## Subscription Strategy

### Pricing Model
- **Free Tier**: 1 user, 50 customers, basic workflow (lead gen)
- **Pro**: Up to 10 users, unlimited customers, full workflow, inventory, documents
- **Business**: Up to 50 users, custom workflows, customer portal, API access
- **Enterprise**: Unlimited users, white-label, SSO, audit compliance, dedicated support

### Billing Integration
- Stripe for subscription management
- Usage metering: customers, storage, API calls
- Annual discount (20%)
- Trial: 14 days full-feature

---

## Feature Flag Strategy

### Implementation Plan
- Feature flags at organization level (not user level)
- Database table: `feature_flags` (organization_id, flag_key, enabled, metadata)
- Service wrapper: `isFeatureEnabled(orgId, flagKey)`
- UI wrapper: `<FeatureGate flag="workflow-builder">` component

### Initial Flags
| Flag | Default | Pro | Business | Enterprise |
|------|---------|-----|----------|-----------|
| `custom-workflow` | off | off | on | on |
| `customer-portal` | off | off | on | on |
| `api-access` | off | off | on | on |
| `white-label` | off | off | off | on |
| `sso` | off | off | off | on |
| `advanced-reports` | off | on | on | on |
| `excel-import` | off | on | on | on |
| `ai-insights` | off | off | on | on |

---

## RBAC Vision

### Role Evolution
```
Current: All authenticated users → full access
Phase 2: Admin, Manager, Technician, Viewer
Phase 4: Owner (billing) + above roles
Phase 5: Custom roles (Enterprise)
```

### Enforcement Layers
1. **Database**: Supabase RLS policies per role
2. **Service**: `withRoleCheck(minimumRole)` wrapper
3. **API**: Role validation in route handlers
4. **UI**: `<RoleGate role="manager">` conditional rendering

---

## Workflow Configuration Vision

### Current State
- Hardcoded 5-stage linear workflow
- Stage names fixed: CREATED → SUBMITTED → APPROVED → INSTALLATION → CLOSED

### Target State
- Admin-configurable stages per organization
- Custom stage names, descriptions, icons
- Configurable transition rules (required docs, approvals, tasks)
- Stage-specific task templates (auto-created on entry)
- Parallel stage support (optional)
- SLA tracking with deadline alerts
- Approval chains (multi-level sign-off)

### Migration Path
1. Abstract current workflow into a configuration table
2. Seed default config matching current hardcoded stages
3. Build workflow builder UI (drag-and-drop)
4. Allow per-organization customization
5. Maintain backward compatibility for existing data

---

## Multi-Tenant Vision

### Current State
- Single-tenant architecture (one org per deployment)
- Organization scoping works but no onboarding flow
- No billing, no plan limits

### Target State
- Self-service organization creation (sign up → create org)
- Plan-based feature gating
- Usage limits per plan (customers, users, storage)
- Organization-level branding (logo, colors)
- Custom subdomain or slug routing
- Data isolation verification (automated tests)
- Cross-org admin panel (super admin)

### Technical Requirements
- Stripe subscription lifecycle
- Webhook handlers for billing events
- Usage tracking and limit enforcement
- Organization provisioning pipeline
- Tenant data export (GDPR)

---

## Mobile App Vision

### Platform
- React Native (shared codebase with web where possible)
- Expo for rapid iteration

### Target Users
- Field technicians (primary)
- Managers on-the-go (secondary)

### Core Features
- Task list (assigned to current user)
- Task status updates
- Photo capture (installation documentation)
- Inventory consumption (barcode scan)
- Customer detail view
- Push notifications
- Offline mode with background sync

### Integration
- Shared API layer with web app
- Supabase Realtime for sync
- Push via Firebase Cloud Messaging

---

## AI Vision

### Near-Term (Phase 3–4)
- **Smart Estimation**: ML model trained on historical installations to predict costs
- **Document Classification**: Auto-categorize uploaded documents by stage
- **Stock Forecasting**: Predict reorder points based on project pipeline

### Long-Term (Phase 5)
- **Natural Language Search**: "Show me all customers in Chennai awaiting approval"
- **Anomaly Detection**: Flag unusual payment patterns or stock discrepancies
- **Workload Balancing**: AI-suggested task assignment based on capacity
- **Chatbot**: Customer portal chatbot for project status queries

---

## Future Integrations

| Integration | Phase | Purpose |
|-------------|-------|---------|
| Stripe | 4 | Subscription billing |
| Twilio / MSG91 | 3 | SMS notifications |
| WhatsApp Business | 4 | Customer communication |
| Google Maps | 3 | Installation site tracking |
| Tally / Zoho Books | 5 | Accounting sync |
| Salesforce / HubSpot | 5 | CRM data exchange |
| DISCOM APIs | 5 | Government approval automation |
| Firebase | 4 | Push notifications (mobile) |

---

## Success Metrics (12 months)

| Metric | Target |
|--------|--------|
| Paying organizations | 50+ |
| Monthly active users | 500+ |
| Customer records managed | 10,000+ |
| Uptime | 99.9% |
| Average response time | < 200ms |
| Mobile app installs | 200+ |
| NPS score | > 40 |
