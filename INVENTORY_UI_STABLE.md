# Inventory Module — Stable UI Reference (July 2026)

This document is the **canonical steering reference** for the current stable Inventory UI in SolarFlow. Use it when extending inventory features, fixing dark-mode issues, or onboarding AI assistants.

---

## Entry points

| Route | Component | Notes |
|-------|-----------|-------|
| `/inventory` | `InventoryTabsPage.tsx` | Primary tab shell (Overview, Spares, Systems, Availability, Import / Export) |
| `/inventory?tab=spares` | `SparePartsPage.tsx` | Spares list with pagination, filters, modals |
| `/inventory?tab=import-export` | `InventoryImportExportPage.tsx` | Unified import + export workflow |
| `/inventory/import-export` | Standalone route wrapping `InventoryImportExportPage` | Same UI, own module header |
| `/inventory/spares?updated=true` | Redirects to `/inventory?tab=spares&updated=true` | Post-import success handling |

**Do not** build new inventory UX on legacy pages (`InventoryImportPage.tsx`, `InventoryImportPageV2.tsx`) unless explicitly migrating them — the stable surface is `InventoryImportExportPage.tsx`.

---

## Architecture

```
InventoryTabsPage (inventory-module shell)
├── InventoryModuleHeader
├── InventorySubNav (desktop tabs / mobile section picker)
└── Tab panels (lazy-loaded)
    ├── InventoryDashboard
    ├── SparePartsPage
    ├── SystemBuilderPage
    ├── SystemAvailabilityPage
    └── InventoryImportExportPage
```

Shared layout: `InventoryPageShell` (`contentOnly` inside tabs; full header on standalone routes).

---

## Design system (stable)

### Visual language

- **Sharp / boxy layout** inside import-export: `border-radius: 0` on cards, panels, step markers, notifications.
- **Depth palette** via CSS variables on `.inventory-module`:
  - `--inv-card`, `--inv-elevated`, `--inv-border`, `--inv-text`, `--inv-secondary`, `--inv-blue`, `--inv-accent`
- **Dark mode**: always use tokens above — never hardcode `#ffffff` on surfaces in inventory components.
- **Stock semantics on Spares**: neutral default stock; **blue highlight** for rows updated by import (not green).

### Notifications

- **Import / Export errors**: `usePushNotifications` + `NotificationHost` on the same page (no redirect).
- **Import success**: persist via `persistInventoryImportSuccess()` → navigate to `/inventory?tab=spares&updated=true` → `SparePartsPage` consumes payload and shows success toast + row highlights.
- Toast host: `.sf-notification-host` — fixed below app header (`z-index: var(--sf-z-notification)`).

### Loaders

- **Buttons**: `AppSpinner` with `variant="onPrimary"` for inline button states.
- **Import overlay**: `ImportProcessingOverlay` — blue inventory spinner (`variant="inventory"`), pulsing ring, progress bar, token-based backdrop (dark-mode safe).
- **Modals**: `ModalBusyOverlay` / `AppSpinner` default variant elsewhere in app.

### React Select (filters / toolbars)

- Shared styles: `inventorySelectStyles.ts`
- Global dark-mode classes: `.inv-toolbar-select__*`, `.inv-select__*`
- Menus are portaled to `document.body` — style via globals, not only module scope.

---

## Import / Export workflow (stable)

**Main file:** `src/modules/inventory/InventoryImportExportPage.tsx`

### Landing

- Two action cards: **Import stock** / **Export snapshot**
- `ImportGuideRail` (`variant="card"`) — three-step guide
- `OperationsHistoryTable` — latest upload banner + prior uploads

### Import wizard steps

1. **Upload** — `ImportGuideRail` (strip) + rule bar + `FileUploadDropzone` (premium)
2. **Review** — `ImportSummaryBar`, `PreviewTable`, confirm actions

Stepper: `ImportWorkflowHeader` (desktop stepper + mobile progress bar).

### Upload UX

- `FileUploadDropzone`: drag/drop, premium icon wrap, file chip
- Validating: `ImportProcessingOverlay` over upload panel
- API: `POST /api/inventory/v3/import/validate`

### Review UX

- `PreviewTable` filter: **Changed only** / **All rows** (token-based active state — not white-on-white in dark mode)
- Mobile: card layout; desktop: inventory table styles
- Confirm: `POST /api/inventory/v3/import/confirm` (ledger-only apply; no double stock — see migration `202607030001_fix_import_stock_double_apply.sql`)

### Post-import flow

```text
confirmImport success
  → persistInventoryImportSuccess({ updatedRows, newRows, errorRows, spareCodes })
  → resetImportFlow()
  → router.push('/inventory?tab=spares&updated=true')
SparePartsPage
  → consumeInventoryImportSuccess()
  → notify success toast
  → highlight spareCodes (blue, 3s)
  → router.replace('/inventory?tab=spares') // strip query param
```

`InventoryTabsPage` syncs active tab from `?tab=` search param on navigation.

### Export

- Filters via `MultiSelectDropdown`
- Download snapshot with `ImportProcessingOverlay` during export

---

## Spares page (stable)

**File:** `src/modules/inventory/spares/SparePartsPage.tsx`

- Toolbar: search, category `InventoryToolbarSelect`, page size, Add spare
- Table: `SparePartsTable` with `InventoryTablePager`
- Modals: `AddSpareModal`, `EditStockModal`
- Import highlight: `highlightedSpareCodes` from `makeSpareCodeKey()`
- Notifications: `NotificationHost` + `usePushNotifications`

---

## Systems & availability (stable)

- **Systems:** `SystemBuilderPage` — `SystemListPanel`, `SystemComponentsTable`, `SystemCardCarousel`, `EditSystemModal`
- **Availability:** `SystemAvailabilityPage` — rebuilt to match inventory tokens and mobile layout
- **Dashboard:** `InventoryDashboard` — `InventoryStatCard` metrics grid

---

## Reusable inventory components

| Component | Purpose |
|-----------|---------|
| `InventoryStatCard` | Metric tiles on dashboard |
| `InventoryActionCard` | Import/export landing cards |
| `InventorySubNav` | Tab navigation + mobile picker |
| `InventoryModuleHeader` | Module title row inside tabs |
| `InventoryTablePager` | Shared pagination control |
| `InventoryToolbarSelect` | Toolbar react-select wrapper |
| `InventorySingleSelect` | Form-level single select |
| `InventoryStatusBadge` | Status pills |
| `ImportGuideRail` | Card (landing) or strip (upload) step guide |
| `ImportWorkflowHeader` | Stepper + mobile progress |
| `ImportSummaryBar` | Validation counts banner |
| `ImportProcessingOverlay` | Full-panel loading state |
| `OperationsHistoryTable` | Import history |
| `FileUploadDropzone` | CSV/XLSX upload |
| `PreviewTable` | Review grid with Changed only / All rows |

Styles live primarily in `src/styles/globals.css` under `.inventory-module`, `.inv-import-export-page`, and dark-mode blocks targeting `html.theme-dark .inventory-module`.

---

## Backend touchpoints

| Endpoint | Role |
|----------|------|
| `POST /api/inventory/v3/import/validate` | Parse + validate upload |
| `POST /api/inventory/v3/import/confirm` | Apply stock changes |
| `GET /api/inventory/v3/...` | Filters, export, etc. |

Import confirm must write stock via ledger/transaction path only (single source of truth for quantity).

---

## Conventions for future changes

1. **Match existing tokens** — read surrounding CSS before adding colors.
2. **Keep import/export boxy** — do not reintroduce large border radii on that flow without explicit design change.
3. **Errors stay on page** — success alone redirects to Spares with toast there.
4. **Mobile** — sticky action bars on import flow (`position: fixed; bottom: 0` inside `.inv-import-export-page`).
5. **Tests** — only add when behavior is non-obvious; prefer manual test plan for pure UI token fixes.

---

## Related docs (update when UI changes)

- [FILE_STRUCTURE_GUIDE.md](./FILE_STRUCTURE_GUIDE.md) — file map
- [EXCEL_IMPORT_FILE_INDEX.md](./EXCEL_IMPORT_FILE_INDEX.md) — import module index
- [FRONTEND_UI_DESIGN.md](./FRONTEND_UI_DESIGN.md) — legacy import screens + availability design notes

When this stable UI changes materially, update **this file first**, then sync the related docs above.
