# 08 — API Reference

## Overview

SolarFlow uses Next.js App Router API routes (`/src/app/api/`) for server-side operations, plus a service layer called directly from client components for most data operations. Authentication is cookie-based (`sb-access-token`), and organization context is resolved server-side.

---

## HTTP API Endpoints

### Customer Module

#### GET `/api/customers/[id]/progress`
Get workflow progress history for a customer.

| Field | Value |
|-------|-------|
| Auth | Required (cookie) |
| Path Params | `id`: UUID — Customer ID |

**Response 200**:
```json
{
  "current_stage": "APPROVED",
  "stage_history": [
    {
      "id": "uuid",
      "previous_stage": "SUBMITTED",
      "current_stage": "APPROVED",
      "trigger_event": "approval-updated",
      "next_required_action": "Complete installation task",
      "metadata": {},
      "changed_by": "uuid",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "next_required_action": "Complete installation task"
}
```

---

### Inventory Module

#### POST `/api/inventory/import/upload`
Upload Excel file for import validation.

| Field | Value |
|-------|-------|
| Auth | Required |
| Content-Type | multipart/form-data |
| Body | `file`: .xlsx file |

#### POST `/api/inventory/import/validate`
Validate parsed rows against existing inventory.

| Field | Value |
|-------|-------|
| Auth | Required |
| Body | `{ "rows": [...] }` |

**Response 200**:
```json
{
  "success": true,
  "data": {
    "validRows": [],
    "invalidRows": [],
    "duplicates": [],
    "summary": { "total": 50, "valid": 45, "invalid": 3, "duplicate": 2 }
  }
}
```

#### POST `/api/inventory/import/confirm`
Apply validated import to database.

| Field | Value |
|-------|-------|
| Auth | Required |
| Body | `{ "batchId": "uuid", "rows": [...], "mode": "upsert" }` |

#### GET `/api/inventory/import/logs`
Retrieve import history. Query param: `status` (default "all").

#### GET `/api/inventory/import/sample-template`
Download sample Excel template (.xlsx).

#### POST `/api/inventory/import/system-availability`
Check system availability impact of pending import.

#### GET `/api/inventory/v3/filters`
Get filter options (categories, suppliers, units).

#### GET `/api/inventory/v3/export`
Export inventory as Excel. Query params: `format`, `category`.

#### POST `/api/inventory/v3/import/validate`
V3 enhanced validation with duplicate detection.

#### POST `/api/inventory/v3/import/confirm`
V3 confirm with stock synchronization.

---

### Admin Module

#### POST `/api/admin/reset-inventory-test-data`
Reset inventory to test defaults. **Development only**.

---

## Service-Layer API (Client-Side Calls)

These are TypeScript functions called directly from components. They resolve auth context internally via `withRequestContext`.

### Customer Service (`src/services/customerService.ts`)

| Function | Params | Returns | Side Effects |
|----------|--------|---------|-------------|
| `getCustomers(options?)` | `{ search?, status?, page?, pageSize? }` | `{ data, count, counts }` | Cache read |
| `getCustomerById(id)` | UUID | `{ data, error }` | — |
| `createCustomer(payload)` | CustomerInsert | Customer row | Cache invalidate, activity log, inventory reserve, workflow evaluate |
| `updateCustomer(id, payload)` | UUID, CustomerUpdate | Customer row | Workflow validation, cache invalidate, activity log, workflow evaluate |
| `deleteCustomer(id)` | UUID | void | Cache invalidate, activity log |
| `getCustomerProgress(id, limit?)` | UUID, number | `{ current_stage, stage_history, next_required_action }` | — |
| `getAssignableSalesReps()` | — | User[] | — |

### Task Service (`src/services/taskService.ts`)

| Function | Params | Returns | Side Effects |
|----------|--------|---------|-------------|
| `getTasks(params?)` | object | `{ data, error, count }` | — |
| `getTasksByCustomerId(id, limit?)` | UUID, number | `{ data, error }` | — |
| `createTask(payload)` | TaskInsert | `{ data, error }` | Activity log |
| `updateTask(id, payload)` | UUID, TaskUpdate | `{ data, error }` | Activity log, workflow evaluate (if completed + customer linked) |
| `deleteTask(id)` | UUID | `{ error }` | Activity log |
| `getAssignableTaskUsers()` | — | `{ data, error }` | — |

### Inventory Service (`src/services/inventoryService.ts`)

| Function | Returns | Cache TTL |
|----------|---------|-----------|
| `getInventoryDashboardMetrics()` | `{ totalSpareParts, lowStockItems, totalSystems, availableSystems, reservedSystems }` | 20s |
| `getStockAlerts()` | Spare parts below min_stock | 15s |
| `getStockTransactionHistory()` | Recent transactions with spare details | — |
| `getSupplierManagementData()` | Supplier list | — |
| `getComponentUsageTracking()` | System component usage with details | — |
| `getAvailableSolarSystems()` | Systems with available count | 30s |
| `getSystemAvailability()` | Detailed per-system availability | — |
| `getInventorySpareSummary()` | Per-spare: available, reserved, consumed | — |

### Document Service (`src/services/documentService.ts`)

| Function | Params | Side Effects |
|----------|--------|-------------|
| `uploadDocument(file, folder?, customerId?)` | File, string, UUID? | Storage upload, metadata insert, activity log, workflow evaluate |
| `listDocuments(search?, page?, pageSize?)` | — | — |
| `listDocumentsByCustomerId(id, limit?)` | UUID | — |
| `downloadDocument(filePath)` | string | — |
| `deleteDocument(id, filePath)` | UUID, string | Storage delete, metadata delete, activity log |

### Auth Service (`src/services/authService.ts`)

| Function | Description |
|----------|-------------|
| `login(email, password)` | Email/password sign-in, sets cookie |
| `loginWithGoogle(redirectTo)` | Google OAuth initiation |
| `logout()` | Sign out, clear cookie, clear cache, clear localStorage |
| `getCurrentSession()` | Get active Supabase session |
| `signUp(email, password, name)` | Register new user with metadata |

### Payment Service (`src/services/paymentService.ts`)

| Function | Description |
|----------|-------------|
| `getPaymentsByInstallationId(id)` | Get payments for a customer (ordered by date desc, limit 100) |
| `createPaymentForInstallation(payload)` | Record new payment |

### Analytics Service (`src/services/analyticsService.ts`)

| Function | Returns | Cache TTL |
|----------|---------|-----------|
| `getFinancialAnalytics()` | `{ totalSales, totalInstallations, monthlyRevenue, profitMargin, capacityInstalled, pipelineConversion }` | 20s |

### Installation Inventory Service (`src/services/installationInventoryService.ts`)

| Function | Description |
|----------|-------------|
| `reserveInventoryForCustomerInstallation({ customerId, systemId })` | Reserve system components for customer |
| `consumeReservedInventoryForInstallation({ customerId, systemId })` | Convert reserved → consumed (release then consume) |

---

## Error Handling Pattern

### Service Layer
```typescript
throw new Error("Operation failed") // Generic — never expose internals
```

### Repository Layer
```typescript
throw new RepositoryError(message, code) // With PostgreSQL error code
```

### Common PostgreSQL Error Codes
| Code | Meaning |
|------|---------|
| `23505` | Unique constraint violation (duplicate) |
| `42703` | Undefined column (schema mismatch) |
| `23503` | Foreign key violation |

### Standard Error Response (API Routes)
```json
{
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "Human-readable message" }
}
```

---

## Authentication Flow for API Requests

```
Client Component
  → Service function call
    → withRequestContext()
      → Read sb-access-token from cookies (next/headers)
      → Create request-scoped Supabase client with Bearer token
      → supabase.auth.getUser(token) → validate
      → Lookup user's organization_id from users table
      → Return { organizationId, userId }
    → Execute business logic with context
```

All API route handlers use `withOrganizationContext()` which follows the same pattern but is designed for the App Router handler context.
