# 11 — Coding Standards

## React Standards

### Component Structure
```typescript
"use client" // Only for client components

import { ... } from "react"          // React imports first
import { ... } from "next/..."        // Framework imports
import { ... } from "@/components/..." // Internal imports
import { ... } from "@/services/..."   // Service imports

type Props = {                         // Props type defined inline or imported
  title: string
  onAction: () => void
}

export default function ComponentName({ title, onAction }: Props) {
  // State declarations
  const [loading, setLoading] = useState(false)

  // Effects
  useEffect(() => { ... }, [])

  // Handlers
  const handleClick = () => { ... }

  // Render
  return (...)
}
```

### Rules
- Use functional components only — no class components
- Prefer `export default function` for page-level components
- Use `"use client"` directive only when needed (state, effects, browser APIs)
- Colocate related state near its usage
- Extract complex logic into custom hooks or service functions
- Use early returns for conditional rendering
- Cleanup effects with return functions
- Use `useMemo` / `useCallback` for expensive computations in render

---

## Next.js Standards

### App Router Conventions
- Pages: `page.tsx` exports default component
- Layouts: `layout.tsx` wraps children
- Route Groups: `(name)` for shared layouts without URL segment
- Dynamic Routes: `[param]` for dynamic segments
- API Routes: `route.ts` with named exports (GET, POST, etc.)

### Data Fetching Pattern
```typescript
// Client-side fetching (current pattern)
useEffect(() => {
  let active = true
  void (async () => {
    setLoading(true)
    try {
      const result = await serviceFunction()
      if (active) setData(result)
    } finally {
      if (active) setLoading(false)
    }
  })()
  return () => { active = false }
}, [])
```

### Rules
- All pages under `(dashboard)` are client components (use `"use client"`)
- API routes handle auth via cookie-based context
- Use `@/` alias for `src/` imports
- Never import server-only modules in client components

---

## TypeScript Standards

### Type Definitions
```typescript
// Prefer type over interface for data shapes
type Customer = {
  id: string
  name: string
  status: string
}

// Use type for function signatures
type ServiceResult<T> = {
  data?: T
  error?: unknown
}

// Use generics for reusable types
type PagedResult<T> = {
  data: T[]
  count: number
  error?: unknown
}
```

### Rules
- Strict mode enabled
- No `any` unless absolutely necessary (annotate with comment why)
- Use `unknown` over `any` for untyped external data
- Database types auto-generated from Supabase (`database.types.ts`)
- Export types from module boundary files
- Non-null assertions (`!`) allowed only for env vars after validation
- Prefer union types over enums

---

## API Standards

### Service Layer Pattern
```typescript
export async function doSomething(id: string) {
  assertValidUUID(id, "entityId")  // Validate input

  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      // Business logic here
      const data = await repositoryFunction(organizationId, ...)
      
      // Side effects (logging, activity)
      await logActivity("Action performed", "entity", id)
      logInfo("Operation completed", { service: "serviceName", organizationId, userId })
      
      return data
    } catch (error) {
      logError("Operation failed", error, { service: "serviceName", organizationId, userId })
      throw new Error("Operation failed")  // Generic message to client
    }
  })
}
```

### Rules
- Every service function wrapped in `withRequestContext`
- UUID validation at service entry point
- Organization scoping enforced at repository level
- Generic error messages thrown to client ("Operation failed")
- Detailed errors logged server-side
- Activity logging for all CRUD operations
- Cache invalidation after mutations

### API Route Pattern
```typescript
export async function POST(request: NextRequest) {
  return withOrganizationContext(async (organizationId) => {
    try {
      const body = await request.json()
      // Validate + execute
      return NextResponse.json({ success: true, data: result })
    } catch (error) {
      return NextResponse.json({ success: false, error: { message: "..." } }, { status: 500 })
    }
  })
}
```

---

## Database Standards

### Query Pattern
```typescript
const { data, error } = await supabase
  .from("table_name")
  .select("col1,col2,col3")         // Explicit column selection
  .eq("organization_id", orgId)       // Always scope by org
  .eq("id", entityId)                 // Additional filters
  .order("created_at", { ascending: false })
  .limit(100)

if (error) handleRepositoryError("repoName", "functionName", error)
return data
```

### Rules
- Always select explicit columns (never `select("*")`)
- Always include `.eq("organization_id", orgId)` for tenant scoping
- Handle errors with `handleRepositoryError` (throws `RepositoryError`)
- Use `.maybeSingle()` for lookups that may return null
- Use `.single()` only for guaranteed-single results (inserts with select)
- Limit queries (default 100-200, max 500-5000 depending on use case)
- Use database functions for complex calculations

---

## Naming Conventions

### Files
| Type | Convention | Example |
|------|-----------|---------|
| Pages | `page.tsx` (Next.js convention) | `page.tsx` |
| Components | PascalCase | `CustomerTable.tsx` |
| Services | camelCase + "Service" | `customerService.ts` |
| Repositories | camelCase + "Repository" | `customerRepository.ts` |
| Hooks | camelCase, "use" prefix | `useAuth.js` |
| Utils | camelCase | `validateUUID.ts` |
| Types | camelCase + ".types" | `database.types.ts` |

### Variables & Functions
| Type | Convention | Example |
|------|-----------|---------|
| Functions | camelCase | `getCustomers`, `handleClick` |
| Components | PascalCase | `CustomerTable`, `AppLayout` |
| Constants | UPPER_SNAKE_CASE | `MAX_DOCUMENT_SIZE_BYTES` |
| Types/Interfaces | PascalCase | `CustomerInsert`, `ServiceResult` |
| Boolean vars | is/has/should prefix | `isLoading`, `hasError` |
| Event handlers | handle prefix | `handleSubmit`, `handleClick` |
| Async fetchers | get/fetch/query prefix | `getCustomers`, `fetchData` |

### Database
- Tables: snake_case, plural (`customers`, `stock_transactions`)
- Columns: snake_case (`organization_id`, `created_at`)
- Foreign keys: `{table}_id` (`customer_id`, `spare_id`)

---

## File Organization

### Import Order
1. React / React DOM
2. Next.js imports
3. Third-party libraries
4. Internal `@/` aliases (components, services, utils)
5. Relative imports (same module)
6. Types (at end or inline)

### Module Organization
- One feature per `modules/` folder
- Shared UI in `components/`
- Business logic in `services/`
- Data access in `repositories/`
- Never import from `modules/` into `components/` (dependency flows down)

---

## Error Handling

### Layers
| Layer | Strategy |
|-------|----------|
| Repository | Throw `RepositoryError` with code |
| Service | Catch, log, re-throw generic `Error("Operation failed")` |
| Component | Try/catch, set error state, display user message |

### Rules
- Never expose internal error details to the client
- Always log the full error server-side with context
- Use structured logging (`logError(message, error, context)`)
- Non-critical failures (activity logging, workflow) should not block primary operations

---

## Logging

### Format
```json
{
  "level": "INFO",
  "message": "Customer created",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "context": {
    "service": "customerService",
    "organizationId": "uuid",
    "userId": "uuid",
    "customerId": "uuid",
    "durationMs": 42.5
  }
}
```

### Rules
- Use `logInfo` for successful operations
- Use `logWarn` for non-critical failures (fallbacks, skips)
- Use `logError` for actual failures
- Include `service`, `organizationId`, `userId` in every log
- Include `durationMs` for performance-sensitive operations
- Never log sensitive data (passwords, tokens, full user records)

---

## Performance

### Client-Side
- Use `useMemo` for expensive computations in render
- Avoid re-renders: stable references for callbacks
- Lazy load heavy components (charts, modals)
- Image optimization via `next/image`

### Server-Side
- In-memory query cache with TTL (15-30 seconds)
- Cache invalidation on mutations
- Parallel data fetching with `Promise.all`
- Limit query result sizes

---

## Security

### Rules
- UUID validation on all entity IDs before queries
- Organization scoping on every database query
- Generic error messages to clients
- No sensitive data in client-accessible responses
- Cookie-based auth with SameSite=Lax
- File upload validation (type, size, name sanitization)
- No raw SQL — always use Supabase query builder

---

## Testing (Recommended — Not Yet Implemented)

### Recommended Stack
- **Unit Tests**: Vitest for services and utilities
- **Component Tests**: Testing Library for React components
- **E2E Tests**: Playwright for critical flows
- **API Tests**: Supertest or direct route handler testing

### What to Test
- Service business logic (workflow transitions, payment calculations)
- Repository error handling
- Component rendering and interactions
- Critical user flows (login, customer creation, stage transitions)
