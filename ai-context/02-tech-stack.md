# 02 — Tech Stack

## Frontend

### Framework
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1.6 | App Router, SSR, file-based routing, API routes |
| React | 19.2.3 | UI component library |
| TypeScript | 5.x | Type safety across the codebase |

### UI Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| Tailwind CSS | 4.2.1 | Utility-first CSS framework |
| Lucide React | 0.576.0 | Icon library (SVG icons) |
| Framer Motion | 12.34.5 | Animations and transitions |
| react-select | 5.10.2 | Advanced dropdown/select components |

### State Management
- **No global state library** — React local state (`useState`, `useEffect`) per component
- **In-memory query cache** — Custom TTL-based cache (`queryCache.ts`) for server-side data
- **Context API** — `AppTopBarProvider` for layout-level state injection

### Form Libraries
- **No dedicated form library** — Custom form components (`FormField`, `FormInput`, `FormSelect`)
- Manual validation in services and utility functions

### Charts
| Library | Version | Purpose |
|---------|---------|---------|
| Recharts | 3.7.0 | Chart rendering (Area, Bar, Line, Pie, Donut, Stacked Bar) |

### Spreadsheet Processing
| Library | Version | Purpose |
|---------|---------|---------|
| ExcelJS | 4.4.0 | Excel export with formatting |
| xlsx (SheetJS) | 0.18.5 | Excel import and parsing |

## Backend

### API Architecture
- **Next.js App Router API Routes** — `/src/app/api/` directory
- **Layered Architecture**: Pages → Services → Repositories → Supabase
- **No separate backend server** — All logic runs within Next.js serverless functions

### Server Actions
- Not currently using Next.js Server Actions
- Business logic executes in service layer called from client components

### Middleware
- **Route Protection**: `src/middleware/authMiddleware.ts`
  - Checks `sb-access-token` cookie on protected routes
  - Falls back to Supabase auth cookies
  - Redirects unauthenticated users to `/login`
- **Request Context**: `src/utils/withRequestContext.ts`
  - Resolves `organizationId` and `userId` from auth session
  - Injected into all service function calls

## Database

### Database Provider
| Service | Purpose |
|---------|---------|
| Supabase | Managed PostgreSQL with Auth, Storage, and real-time |
| PostgreSQL | Underlying database engine (via Supabase) |

### Key Database Features Used
- Row Level Security (RLS) — via organization scoping
- Database Functions (`calculate_system_inventory_availability`, `current_user_org_id`, `current_user_role`)
- Views (`v_system_inventory_availability`)
- Foreign key constraints across all tables
- UUID primary keys

### Storage
- **Supabase Storage** — Document file storage (PDFs, images, Word docs)
- Organized by `organizationId/folder/timestamp-filename`

## Authentication

| Provider | Method |
|----------|--------|
| Supabase Auth | Email/password (`signInWithPassword`) |
| Supabase Auth | Google OAuth (`signInWithOAuth`) |
| Custom | Cookie-based session sync (`sb-access-token`) |
| Custom | Idle timeout monitoring (30–60 min) |

## Deployment

### Hosting
- **Not configured** — No deployment pipeline in place
- Architecture supports Vercel deployment (standard Next.js)

### Build Process
```bash
npm run build    # next build (production)
npm run dev      # PowerShell script (dev-clean.ps1)
npm run dev:raw  # next dev (direct)
npm run start    # next start (production server)
npm run lint     # eslint
```

### Environment Setup
Required environment variables (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_DB_PASSWORD=<database-password>
```

## Dependencies

### Production Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.1.6 | React framework with App Router |
| `react` | 19.2.3 | UI component library |
| `react-dom` | 19.2.3 | React DOM rendering |
| `@supabase/supabase-js` | ^2.98.0 | Supabase client SDK (auth, DB, storage) |
| `recharts` | ^3.7.0 | Charting library for dashboards |
| `lucide-react` | ^0.576.0 | SVG icon components |
| `framer-motion` | ^12.34.5 | Animation library |
| `react-select` | ^5.10.2 | Advanced select/dropdown components |
| `exceljs` | ^4.4.0 | Excel file generation with formatting |
| `xlsx` | ^0.18.5 | Excel file parsing (import) |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5 | Type checking and compilation |
| `tailwindcss` | ^4.2.1 | Utility CSS framework |
| `@tailwindcss/postcss` | ^4.2.1 | Tailwind PostCSS integration |
| `postcss` | ^8.5.8 | CSS post-processing |
| `autoprefixer` | ^10.4.27 | CSS vendor prefixing |
| `eslint` | ^9 | Code linting |
| `eslint-config-next` | 16.1.6 | Next.js ESLint rules |
| `@types/node` | ^20 | Node.js type definitions |
| `@types/react` | ^19 | React type definitions |
| `@types/react-dom` | ^19 | React DOM type definitions |

### Notable Absences
- No testing framework (Jest, Vitest, Playwright)
- No state management library (Redux, Zustand, Jotai)
- No form management library (React Hook Form, Formik)
- No schema validation library (Zod, Yup)
- No CI/CD configuration
- No Docker/containerization
