# 10 — UI Standards

## Design Philosophy

SolarFlow targets **premium SaaS quality** with these principles:
- Mobile-first responsive design
- Consistent component language
- Accessible interactions
- Dark/light mode parity
- Smooth, purposeful animations

---

## Button Standards

### Sizing
| Size | Height | Padding | Font | Use Case |
|------|--------|---------|------|----------|
| Default | 40px | 0 16px | 14px/500 | Primary actions, forms |
| Compact | 40px | 0 12px | 13px/500 | Inline actions, table rows |
| Mobile Bottom Bar | 36px (2.25rem) | — | — | Fixed bottom action bar |

### Variants
| Variant | When to Use |
|---------|-------------|
| Primary (gradient) | Main page action, form submit, confirm |
| Secondary (border) | Cancel, alternative action, filters |
| Danger (red) | Delete, destructive confirmation |
| Ghost (text-only) | Inline links, minimal actions |

### States
- **Default**: Base styling
- **Hover**: `translateY(-1px)`, brightness increase
- **Active**: `scale(0.98)`
- **Disabled**: opacity 0.55, `cursor: not-allowed`
- **Loading**: Spinner + "Loading..." text

### Rules
- Always include icon + text for primary actions
- Use consistent icon sizes (16px in buttons)
- Never stack multiple primary buttons adjacent — one primary, rest secondary
- Mobile: full-width buttons in modals and forms

---

## Table Standards

### Structure
```
.table-shell (outer border + radius)
  └── .table
      ├── thead (muted background)
      │   └── tr > th (12px, weight 500, uppercase tracking)
      └── tbody
          └── tr > td (14px, standard padding)
```

### Behavior
- Row hover: subtle background change
- Sortable columns: visual indicator (chevron)
- Pagination: bottom-aligned, page size selector
- Empty state: centered illustration + message

### Mobile
- Horizontal scroll with `-webkit-overflow-scrolling: touch`
- Or transform to card layout below `md` breakpoint
- Minimum column width to prevent crushing

### Rules
- Always show row count
- Paginate at 20 rows default (max 100)
- Include search/filter above table
- Actions column aligned right
- Status cells use colored badges

---

## Modal Standards

### Sizing
| Type | Max Width | Use Case |
|------|-----------|----------|
| Small | 400px | Confirmations, single input |
| Medium | 520px | Forms (1-6 fields) |
| Large | 640px | Complex forms, previews |
| Full-width | 90vw / 800px | Tables, imports, multi-step |

### Structure
```
Overlay (backdrop blur + dark scrim)
  └── Panel
      ├── Header (title + close button)
      ├── Body (scrollable content)
      └── Footer (action buttons: secondary left, primary right)
```

### Animations
- Overlay: 170ms fade-in
- Panel: 200ms scale(0.98) + translateY(6px) → normal

### Rules
- Always have a close button (X) in header
- Escape key closes modal
- Click outside closes (unless form has changes)
- Primary action button on right
- Destructive modals: red primary button with confirmation text
- Mobile: full-screen modals below `sm` breakpoint

---

## Search Standards

### Structure
```
.search-input-wrapper
  ├── .search-input-icon (left-aligned, 16px)
  └── .search-input (left-padded 38px)
```

### Behavior
- Debounce search input (300ms recommended)
- Show clear button when input has value
- Placeholder: descriptive ("Search customers by name, email...")
- Results update as user types

### Rules
- Search bar always above the content it filters
- Combined with filter dropdowns in a `FilterBar`
- Mobile: full-width, slightly shorter (38px)

---

## Filter Standards

### Types
| Filter Type | Component | Use Case |
|-------------|-----------|----------|
| Text search | SearchInput | Name, email, content search |
| Status filter | Dropdown/Select | Stage, status, priority |
| Date range | DatePicker | Time-based filtering |
| Category | Dropdown/Chips | Category, type classification |

### Layout
- Horizontal row above content on desktop
- Stacked on mobile
- Active filters shown as removable chips/tags

---

## Dropdown Standards

### Trigger
- Same height as inputs (40px)
- Clear visual indicator (chevron right)
- Shows current selection as text

### Menu
- Appears below trigger
- Max-height with scroll (300px recommended)
- Rounded corners (12px)
- Shadow for elevation
- Fade-in animation (160ms)

### Items
- Padding: 12px 16px
- Hover: background change
- Selected: purple tint
- Support for icons alongside text

---

## Navigation Standards

### Sidebar
- Desktop: 256px wide (collapsible to 80px)
- Mobile: Full-screen overlay drawer
- Sections: Grouped with headers ("Core", "Operations")
- Active item: violet highlight background
- Icons: 20px in sidebar context

### Header
- Fixed position (sticky)
- Height: 64px
- Contains: hamburger (mobile), search, theme toggle, user dropdown
- Backdrop blur for scroll-under content

### Breadcrumbs
- Show page hierarchy
- Clickable ancestors, text-only current
- Max 3 levels visible

---

## Dark Mode Standards

### Rules
- Every color must have a dark equivalent
- Never hardcode white/black — use CSS variables
- Borders should be visible but subtle in both modes
- Shadows adjust opacity for dark mode
- Images/illustrations should work on both backgrounds
- Active/selected states use the same hue, adjusted for contrast

### Testing Checklist
- [ ] All text readable in both modes
- [ ] No white flashes on page load
- [ ] Focus rings visible in dark mode
- [ ] Hover states distinguishable
- [ ] Disabled states clear in both modes
- [ ] Charts/visualizations contrast sufficient

---

## Loading States

### Types
| State | Component | When |
|-------|-----------|------|
| Page load | Full-page spinner (centered) | Initial page render |
| Section load | Inline spinner + "Loading..." | Data fetching |
| Button action | LoadingButton (spinner + text) | Form submission |
| Skeleton | Animated placeholder shapes | Content preview |

### Rules
- Show loading within 100ms of action start
- Never show empty page — always show skeleton or spinner
- Loading buttons: disable click, show spinner, change text
- Skeleton loaders should match content shape

---

## Error States

### Types
| State | Display | Recovery |
|-------|---------|----------|
| Form validation | Field-level error text (red, below input) | Fix field value |
| API error | Toast notification or inline alert | Retry button |
| 404 / Not found | Full-page empty state | Back button |
| Network error | Banner or toast | Retry |
| Permission denied | Alert with explanation | Contact admin |

### Rules
- Error messages should be user-friendly (not technical)
- Always provide a recovery path (retry, go back, contact support)
- Form errors: shake animation (180ms) + red border
- Don't clear form on error — preserve user input

---

## Success States

### Types
| State | Display |
|-------|---------|
| Form submitted | Toast "Customer created" + redirect |
| Action completed | Brief success toast (3s auto-dismiss) |
| Upload complete | Inline success indicator |

### Rules
- Success feedback within 100ms of completion
- Auto-dismiss success toasts (3-5 seconds)
- Redirect to relevant page after creation
- Don't block UI with success modals

---

## Empty States

### Structure
```
Container (centered, max-width 400px)
  ├── Illustration/Icon (48-64px)
  ├── Title ("No customers yet")
  ├── Description ("Create your first customer to get started")
  └── CTA Button (primary action)
```

### Rules
- Always show on first-time-empty collections
- Include actionable CTA (create, import, learn more)
- Keep text concise and encouraging
- Use the `EmptyState` component

---

## Skeleton Loaders

### Rules
- Match the shape of real content
- Use subtle pulse animation (Tailwind `animate-pulse`)
- Show 3-5 skeleton rows for tables
- Show 4 skeleton cards for grid views
- Gray background: `bg-slate-200` / `bg-slate-700` (dark)
