# 03 — Project Structure

## Root Directory

```
solarflow/
├── .env.local                  # Environment variables (Supabase credentials)
├── .gitignore                  # Git ignore rules
├── eslint.config.mjs           # ESLint configuration
├── next.config.ts              # Next.js configuration
├── next-env.d.ts               # Next.js TypeScript declarations
├── package.json                # Dependencies and scripts
├── package-lock.json           # Locked dependency versions
├── postcss.config.mjs          # PostCSS configuration (Tailwind)
├── scripts/                    # Development utility scripts
├── public/                     # Static assets
├── src/                        # Application source code
└── ai-context/                 # Project documentation (this folder)
```

## Source Directory (`src/`)

```
src/
├── app/                        # Next.js App Router (pages + API)
├── components/                 # Reusable UI components
├── hooks/                      # Custom React hooks
├── lib/                        # Core libraries and utilities
├── middleware/                  # Route middleware
├── modules/                    # Feature-level page components
├── repositories/               # Data access layer
├── services/                   # Business logic layer
├── styles/                     # Global CSS styles
├── types/                      # TypeScript type definitions
├── utils/                      # Utility functions
└── proxy.ts                    # Middleware entry point
```

---

## Detailed Breakdown

### `src/app/` — App Router Pages & API

**Purpose**: Next.js file-based routing. Defines all pages and API endpoints.
**Ownership**: Routing layer — maps URLs to page components.

```
app/
├── layout.tsx                  # Root layout (Inter font, AuthSessionSync, meta)
├── (auth)/
│   └── login/page.tsx          # Login page
├── (dashboard)/
│   ├── layout.tsx              # Dashboard layout (AppLayout wrapper)
│   ├── analytics/page.tsx      # Analytics/financial dashboard
│   ├── customers/
│   │   ├── page.tsx            # Customer list
│   │   ├── add/page.tsx        # Add customer wizard
│   │   └── [id]/
│   │       ├── page.tsx        # Customer detail
│   │       └── edit/page.tsx   # Edit customer
│   ├── dashboard/page.tsx      # Main dashboard
│   ├── documents/page.tsx      # Document management
│   ├── estimator/page.tsx      # Solar estimator
│   ├── inventory/page.tsx      # Inventory management
│   ├── notifications/page.tsx  # Notifications
│   ├── reports/page.tsx        # Reports
│   ├── settings/page.tsx       # Settings
│   └── tasks/page.tsx          # Task management
└── api/
    ├── admin/
    │   └── reset-inventory-test-data/route.ts
    ├── customers/
    │   └── [id]/progress/route.ts
    └── inventory/
        ├── import/
        │   ├── confirm/route.ts
        │   ├── logs/route.ts
        │   ├── sample-template/route.ts
        │   ├── system-availability/route.ts
        │   ├── upload/route.ts
        │   └── validate/route.ts
        └── v3/
            ├── export/route.ts
            ├── filters/route.ts
            └── import/
                ├── confirm/route.ts
                └── validate/route.ts
```

---

### `src/components/` — Reusable UI Components

**Purpose**: Shared, reusable UI primitives and domain components.
**Ownership**: Design system and cross-feature UI.

```
components/
├── auth/
│   └── AuthSessionSync.tsx     # Session state management, cookie sync, idle timeout
├── charts/
│   ├── AreaChart.tsx           # Recharts area chart wrapper
│   ├── BarChart.tsx            # Recharts bar chart wrapper
│   ├── DonutChart.tsx          # Recharts donut/pie chart
│   ├── LineChart.tsx           # Recharts line chart
│   ├── PieChart.tsx            # Recharts pie chart
│   └── StackedBarChart.tsx     # Recharts stacked bar
├── customers/
│   ├── CustomerForm.tsx        # Customer create/edit form
│   ├── CustomerTable.tsx       # Customer list table
│   └── StageSection.tsx        # Workflow stage display
├── dashboard/
│   └── StatCard.tsx            # Dashboard stat card
├── forms/
│   ├── FormField.tsx           # Form field wrapper with label/error
│   ├── FormInput.tsx           # Text input component
│   ├── FormSelect.tsx          # Select/dropdown component
│   ├── FormTextarea.tsx        # Textarea component
│   └── SearchFilterBar.tsx     # Search + filter bar layout
├── inventory/
│   ├── InventoryDashboard.tsx  # Inventory metrics dashboard
│   ├── SolarSystemBuilder.tsx  # System composition UI
│   └── ...                     # Additional inventory components
├── layout/
│   ├── AppLayout.tsx           # Main layout (sidebar + header + content)
│   ├── AppTopBarContext.tsx    # Top bar content injection context
│   ├── ContentArea.tsx         # Content wrapper component
│   ├── FilterBar.tsx           # Filter/toolbar wrapper
│   ├── Header.tsx              # Top header bar with theme toggle
│   ├── PageContainer.tsx       # Page wrapper with title/breadcrumbs
│   └── Sidebar.tsx             # Navigation sidebar (collapsible)
├── modals/
│   ├── AppModal.tsx            # Base modal wrapper
│   ├── ConfirmModal.tsx        # Confirmation dialog
│   └── FormModal.tsx           # Form inside modal pattern
├── tables/
│   ├── DataTable.tsx           # Generic data table with sort/filter
│   └── DataTable.jsx           # Legacy JSX version
└── ui/                         # 34 UI primitives
    ├── Accordion.tsx
    ├── Alert.tsx
    ├── Avatar.tsx
    ├── Badge.tsx
    ├── Breadcrumb.tsx
    ├── Button.tsx
    ├── Card.tsx
    ├── ChartCard.tsx
    ├── Checkbox.tsx
    ├── Divider.tsx
    ├── Drawer.tsx
    ├── Dropdown.tsx
    ├── EmptyState.tsx
    ├── GoTopButton.tsx
    ├── Input.tsx
    ├── KanbanBoard.tsx
    ├── Loader.tsx
    ├── LoadingButton.tsx
    ├── Modal.tsx
    ├── ModalFormWrapper.tsx
    ├── ModalPortal.tsx
    ├── Pagination.tsx
    ├── Radio.tsx
    ├── Select.tsx
    ├── Spinner.tsx
    ├── StatCard.tsx
    ├── StatusBadge.tsx
    ├── Table.tsx
    ├── Tabs.tsx
    ├── Tag.tsx
    ├── Textarea.tsx
    ├── Toast.tsx
    ├── Tooltip.tsx
    └── UserDropdown.tsx
```

---

### `src/modules/` — Feature Page Components

**Purpose**: Page-level feature implementations. Each module is a self-contained feature.
**Ownership**: Feature teams — one module per domain area.

```
modules/
├── ai/
│   └── AiInsightsPanel.tsx         # AI-powered insights widget
├── analytics/
│   └── FinancialDashboard.tsx      # Financial overview page
├── customers/
│   ├── AddCustomerModal.tsx        # Quick add modal
│   ├── CustomerDetailPage.jsx      # Legacy detail page
│   ├── CustomerDetailsPage.tsx     # TypeScript detail page
│   ├── CustomerEditPage.tsx        # Edit customer page
│   ├── CustomersPage.tsx           # Customer list page
│   ├── CustomerTable.tsx           # Customer-specific table
│   ├── wizard/                     # Multi-step creation wizard
│   └── workflow/                   # Workflow stage cards/modals
├── dashboard/
│   └── DashboardPage.tsx           # Main dashboard
├── documents/
│   ├── DocumentsPage.tsx           # Document management page
│   └── UploadDocumentModal.tsx     # Upload document modal
├── estimator/
│   ├── EstimatorForm.tsx           # Estimator input form
│   ├── EstimatorResult.tsx         # Estimation results display
│   └── SolarEstimatorPage.tsx      # Estimator page wrapper
├── inventory/
│   ├── availability/               # System availability dashboard
│   ├── components/                 # Shared inventory UI (dropzone, preview)
│   ├── dashboard/                  # Inventory dashboard metrics
│   ├── spares/                     # Spare parts management
│   ├── systems/                    # System builder UI
│   ├── InventoryImportExportPage.tsx
│   ├── InventoryImportPage.tsx
│   ├── InventoryImportPageV2.tsx
│   ├── InventoryPage.jsx
│   ├── InventoryTabsPage.tsx
│   └── SystemAvailabilityDashboard.tsx
├── login/
│   └── LoginPage.tsx               # Login page with carousel
├── notifications/
│   └── NotificationsPage.tsx       # Notifications page
├── reports/
│   └── ReportsPage.tsx             # Reports page
├── settings/
│   ├── ProfilePage.tsx             # User profile settings
│   └── SettingsPage.tsx            # Organization settings
└── tasks/
    ├── AddTaskModal.tsx            # Create task modal
    ├── TasksPage.tsx               # Task list page
    └── TaskTable.tsx               # Task table component
```

---

### `src/services/` — Business Logic Layer

**Purpose**: All business rules, validation, and orchestration. Services call repositories and enforce domain rules.
**Ownership**: Core business logic — change here requires domain understanding.

```
services/
├── activityLogService.ts           # Audit trail logging
├── analyticsService.ts             # Analytics data aggregation
├── authService.ts                  # Authentication (login, logout, OAuth)
├── customerService.ts              # Customer CRUD + workflow validation
├── customerWorkflowService.ts      # Workflow stage evaluation + completion
├── documentService.ts              # Document upload/download/delete
├── installationInventoryService.ts # Inventory reservation for installations
├── inventoryImportService.ts       # Excel import processing
├── inventoryService.ts             # Inventory dashboard + stock management
├── notificationsService.ts         # Notification data
├── paymentService.ts               # Payment CRUD
├── reportService.ts                # Report generation
├── settingsService.ts              # Organization/user settings
├── spareService.ts                 # Spare parts CRUD
├── systemService.ts                # Solar systems CRUD
└── taskService.ts                  # Task CRUD + workflow triggers
```

---

### `src/repositories/` — Data Access Layer

**Purpose**: Direct Supabase queries. Each repository maps to one or more database tables.
**Ownership**: Database interface — any schema change impacts here.

```
repositories/
├── activityLogRepository.ts
├── customerRepository.ts
├── customerWorkflowRepository.ts
├── documentRepository.ts
├── inventoryRepository.ts
├── repositoryUtils.ts              # Error handling, RepositoryError class
├── spareRepository.ts
├── systemRepository.ts
└── taskRepository.ts
```

---

### `src/lib/` — Core Libraries

**Purpose**: Shared utilities, client initialization, and cross-cutting concerns.
**Ownership**: Platform infrastructure.

```
lib/
├── supabaseClient.ts       # Supabase client singleton (typed)
├── orgContext.ts            # Organization/user context resolution
├── queryCache.ts            # In-memory TTL cache for server queries
├── responsive.ts            # Responsive validation utilities
├── constants.ts             # App-wide constants (APP_NAME)
├── auth.ts                  # Auth re-exports
├── api.ts                   # API utility helpers
└── inventoryImportNormalize.ts  # Import data normalization
```

---

### `src/utils/` — Utility Functions

**Purpose**: Pure utility functions with no business logic.
**Ownership**: Shared infrastructure.

```
utils/
├── logger.ts                # Structured logging (INFO/WARN/ERROR)
├── validateUUID.ts          # UUID validation helper
├── withRequestContext.ts    # Request context injection wrapper
├── withOrganizationContext.ts # Organization context for API routes
├── errorResponse.ts         # Standardized error responses
├── errorHandlingStrategy.ts # Error normalization
├── excelImportParser.ts     # Excel file parsing utility
├── systemAvailabilityCalculator.ts  # Availability computation
└── validationEngine.ts      # Generic validation rules engine
```

---

### `src/types/` — TypeScript Definitions

```
types/
├── database.types.ts        # Auto-generated Supabase schema types
└── service.types.ts         # ServiceResult<T>, PagedResult<T> types
```

---

### `src/styles/` — Global Styles

```
styles/
└── globals.css              # Design system CSS variables, component classes, dark mode
```

---

### `scripts/` — Development Utilities

```
scripts/
├── dev-clean.ps1            # PowerShell dev server startup with cleanup
└── reseed-customers.js      # Database reseeding script
```

---

### `public/` — Static Assets

```
public/
├── assets/
│   ├── auth/                # Login page carousel images
│   ├── templates/           # Sample import templates (.xlsx)
│   ├── solarflow-*.svg      # Logo variants (dark, light, icon, favicon)
├── solarflow-*.svg          # Additional logo/icon files
└── *.svg                    # Default Next.js assets
```
