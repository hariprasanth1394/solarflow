# 09 — Design System

## Single Source of Truth

This document defines SolarFlow's visual language. All UI code must reference these tokens and patterns. If a component deviates from these standards, the component is wrong — not this document.

---

## Colors

### Core Palette

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--bg` | `#ffffff` | `#080f1c` | Page background |
| `--surface` | `#f8fafc` | `#111827` | Section backgrounds |
| `--surface-strong` | `#ffffff` | `#131a2a` | Cards, elevated surfaces |
| `--text` | `#111827` | `#e5e7eb` | Primary text |
| `--muted` | `#64748b` | `#94a3b8` | Secondary/helper text |
| `--border` | `#e5e7eb` | `#1f2937` | Borders, dividers |
| `--hover` | `#f3f4f6` | `#111827` | Hover state backgrounds |

### Brand Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--primary-start` | `#2563eb` | `#3b82f6` | Gradient start (blue) |
| `--primary-end` | `#7c3aed` | `#8b5cf6` | Gradient end (violet) |
| `--primary-soft` | `rgba(59,130,246,0.12)` | `rgba(99,102,241,0.18)` | Soft backgrounds |
| `--danger` | `#ef4444` | `#ef4444` | Destructive actions |
| `--danger-soft` | `rgba(239,68,68,0.12)` | `rgba(239,68,68,0.16)` | Danger backgrounds |

### Sidebar Colors

| Token | Light | Dark |
|-------|-------|------|
| `--sf-sidebar-bg` | `#0f172a` | `var(--bg)` |
| `--sf-sidebar-border` | `#1e293b` | `var(--border)` |
| `--sf-sidebar-text` | `#e2e8f0` | `var(--text)` |

### Semantic Colors (Status)

| Status | Color | Dark Variant |
|--------|-------|-------------|
| Completed | `#22c55e` | `#4ade80` |
| Current/Active | `#7c3aed` / `#a78bfa` | `#a78bfa` |
| Pending | `#64748b` | `#94a3b8` |
| Warning | `#f59e0b` / amber | — |
| Error | `#ef4444` / rose | — |

---

## Typography

### Font
- **Family**: Inter (Google Fonts)
- **Variable**: `--font-inter`
- **Rendering**: antialiased, optimizeLegibility

### Type Scale

| Token | Size | Weight | Letter-Spacing | Usage |
|-------|------|--------|----------------|-------|
| `--font-h1-size` | 20px | 600 | -0.02em | Page titles |
| `--font-h2-size` | 16px | 600 | -0.01em | Section headings |
| `--font-h3-size` | 14px | 500 | normal | Card titles |
| `--font-body-size` | 14px | 400 | normal | Body, inputs, table cells |
| `--font-secondary-size` | 13px | 400 | normal | Helper text (`.text-sm`) |
| `--font-label-size` | 12px | 500 | normal | Labels, table headers (`.text-xs`) |

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xxs` | 4px | Tight internal gaps |
| `--space-xs` | 8px | Icon gaps, compact padding |
| `--space-sm` | 12px | Default input/button internal padding |
| `--space-md` | 16px | Standard spacing between elements |
| `--space-lg` | 20px | Section spacing |
| `--space-xl` | 24px | Large section gaps |
| `--space-2xl` | 32px | Page-level spacing |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 10px | Buttons, inputs, dropdowns |
| `--radius-md` | 12px | Dropdown menus, small cards |
| `--radius-lg` | 16px | Cards, modals, panels |

---

## Z-Index Layers

| Token | Value | Purpose |
|-------|-------|---------|
| `--sf-z-content` | 1 | Main content |
| `--sf-z-subnav` | 30 | Sub-navigation bar |
| `--sf-z-topbar` | 100 | Sticky header |
| `--sf-z-sidebar-backdrop` | 110 | Mobile sidebar overlay |
| `--sf-z-sidebar` | 115 | Sidebar panel |
| `--sf-z-dropdown` | 200 | Dropdown menus |
| `--sf-z-modal` | 1000 | Modal dialogs |

---

## Buttons

### Specs
- Height: **40px** (standard), **36px** (mobile bottom bar)
- Padding: `0 var(--space-md)` (0 16px)
- Border-radius: `var(--radius-sm)` (10px)
- Font: `var(--font-body-size)` / weight 500
- Icon size: 16px inside buttons
- Gap: `var(--space-sm)` (12px) between icon and text

### Variants

| Class | Background | Text | Border | Use |
|-------|-----------|------|--------|-----|
| `.btn-primary` | gradient(primary-start → primary-end) | white | transparent | Main action |
| `.btn-secondary` | `var(--surface)` | `var(--text)` | `var(--border)` | Cancel, alternative |
| `.btn-danger` | `var(--danger)` | white | transparent | Delete, destructive |
| `.btn-compact` | inherits variant | — | — | Tight spaces (same height) |

### States
- **Hover**: `translateY(-1px)` + brightness(1.05)
- **Active**: `scale(0.98)`
- **Disabled**: opacity 0.55, cursor not-allowed
- **Loading**: Spinner (16px) + "Loading..." text, disabled

---

## Inputs

### Specs
- Height: **40px**
- Padding: `0 var(--space-sm)` (0 12px)
- Border: `1px solid var(--border)`
- Background: `var(--surface)`
- Border-radius: `var(--radius-sm)` (10px)
- Font: `var(--font-body-size)` (14px)
- Placeholder color: `var(--text-muted)`

### Focus State
- Border-color: `var(--primary-start)`
- Box-shadow: `0 0 0 3px rgba(59, 130, 246, 0.16)`

### Search Input
- Icon: 16px, positioned left (12px offset)
- Input: left-padded 38px
- Mobile: 38px height, 12px font

---

## Dropdowns

### Trigger
- Same specs as Input (40px height, radius-sm)
- Right chevron indicator
- `justify-content: space-between`

### Menu
- Border-radius: `var(--radius-md)` (12px)
- Background: `var(--surface-strong)`
- Border: `1px solid var(--border)`
- Shadow: `0 16px 30px rgba(15, 23, 42, 0.08)`
- Animation: 160ms fade + translateY(-4px → 0)
- Max-height: scroll after 300px

### Items
- Padding: `var(--space-sm) var(--space-md)` (12px 16px)
- Border-radius: `var(--radius-sm)`
- Hover: `var(--hover)` background
- Selected: `rgba(124, 58, 237, 0.15)` background

---

## Cards

| Class | Border | Background | Shadow | Radius |
|-------|--------|-----------|--------|--------|
| `.card` / `.sf-card` | none | `var(--surface-strong)` | none | `var(--radius-lg)` |
| `.sf-surface-card` | none | `var(--surface-strong)` | `0 16px 40px rgba(15,23,42,0.06)` | `var(--radius-lg)` |
| `.sf-section-card` | `1px solid var(--border)` | `var(--surface-strong)` | none | `var(--radius-lg)` |
| `.sf-mobile-list-card` | `1px solid var(--border)` | `var(--surface-strong)` | none | 14px |

---

## Tables

### Structure
```
.table-shell (border, radius 0.75rem, shadow, overflow hidden)
  └── .table (full-width, border-collapse)
      ├── thead (blended bg: card + hover)
      │   └── th (12px, weight 500, padding 16px 20px)
      └── tbody
          └── tr > td (14px, padding 16px 20px)
              └── hover: subtle bg shift
```

### Rules
- Always wrap in `.table-shell`
- Use `.sf-table` class for themed tables
- Mobile: horizontal scroll with touch scrolling
- Include row count + pagination below

---

## Modals

### Specs
- Overlay: dark scrim + `backdrop-filter: blur()`
- Panel border-radius: `var(--radius-lg)` (16px)
- Background: `var(--sf-card-bg)`
- Border: `1px solid var(--sf-card-border)`

### Sizes
| Type | Max Width |
|------|-----------|
| Small | 400px |
| Medium | 520px |
| Large | 640px |
| Full | 90vw / 800px |

### Animations
- Overlay: 170ms fade-in
- Panel: 200ms `scale(0.98) translateY(6px)` → normal

### Structure
```
Overlay
  └── Panel
      ├── Header (title + X close)
      ├── Body (scrollable)
      └── Footer (secondary left, primary right)
```

---

## Status Badges

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| Completed | green-50/green-900/10% | green-700/400 | green-200/green-500/30% |
| Active/Current | violet-50/violet-900/10% | violet-700/300 | violet-200/violet-500/30% |
| Pending | slate-100/slate-800 | slate-600/400 | slate-200/slate-700 |
| Warning | amber-50/amber-900/10% | amber-700/300 | amber-200/amber-500/30% |
| Error | rose-50/rose-900/10% | rose-700/300 | rose-200/rose-500/30% |

---

## Theme Tokens (Complete Reference)

### Light Mode Derived
| Token | Value |
|-------|-------|
| `--sf-bg` | `var(--bg)` |
| `--sf-text` | `var(--text)` |
| `--sf-card-bg` | `var(--surface-strong)` |
| `--sf-card-border` | `var(--border)` |
| `--sf-muted-text` | `var(--muted)` |
| `--sf-primary-glow` | `rgba(59, 130, 246, 0.35)` |
| `--sf-table-head` | `#f2f6fb` |
| `--sf-focus-glow` | `0 0 0 3px rgba(88, 104, 221, 0.22)` |
| `--sf-hover-soft` | `color-mix(in srgb, var(--sf-primary-start) 8%, var(--sf-card-bg))` |

---

## Dark Mode Rules

### Implementation
1. Theme stored in `localStorage` as `solarflow-theme` ("dark" / "light")
2. Inline `<head>` script applies `theme-dark` + `dark` class before paint (no flash)
3. `AppLayout` manages toggle state
4. CSS variables change values under `html.theme-dark` / `html.dark`

### Rules for Developers
- **Never** hardcode `#ffffff`, `#000000`, or any slate color directly
- **Always** use `var(--bg)`, `var(--text)`, `var(--border)`, etc.
- Tailwind utility overrides exist for: `bg-white`, `bg-slate-*`, `text-slate-*`, `border-slate-*`
- Test every new component in both modes
- Focus rings must be visible in dark mode
- Shadows should reduce opacity in dark mode (lighter feel)

---

## Mobile Rules

### Breakpoints (Tailwind)
| Name | Width | Usage |
|------|-------|-------|
| sm | 640px | Minor adjustments |
| md | 768px | Tablet, hide mobile bottom bar |
| lg | 1024px | Desktop sidebar always visible |
| xl | 1280px | Wide grid layouts |

### Layout Rules
- Sidebar: full-width drawer on mobile (slide-in, 220ms)
- Content: 100% width, no horizontal overflow
- Bottom bar: fixed, grid-cols-3, below md only
- Page content: `padding-bottom: 90px` on mobile (for bottom bar)
- Touch targets: minimum 40px × 40px
- Cards: `grid-cols-1` on mobile, `md:grid-cols-2`, `xl:grid-cols-4`

### Responsive Patterns
```css
/* Stats grid */
grid-cols-1 md:grid-cols-2 xl:grid-cols-4

/* Charts */
grid-cols-1 xl:grid-cols-2

/* Detail layout */
grid-cols-1 xl:grid-cols-3
```

---

## Icon System

- **Library**: Lucide React
- **Default stroke-width**: 1.75 (set via CSS)
- **Sizes by context**:
  - Buttons / dropdowns: 16px
  - Header: 18px
  - Sidebar: 20px
- **Style**: `vector-effect: non-scaling-stroke`

---

## Animation Standards

| Context | Duration | Easing | Property |
|---------|----------|--------|----------|
| Color transitions | 220ms | cubic-bezier(0.2, 0.8, 0.2, 1) | bg, border, color, fill, stroke, shadow |
| Modal overlay | 170ms | ease-out | opacity |
| Modal panel | 200ms | ease-out | opacity, transform |
| Dropdown menu | 160ms | ease | opacity, transform |
| Sidebar slide | 220ms | ease-out | transform |
| Button hover | 180ms | ease | transform, shadow, filter |

---

## Known Inconsistencies (To Fix)

| Issue | Location | Standard |
|-------|----------|----------|
| `rounded-none` on login buttons | LoginPage.tsx | Should use `var(--radius-sm)` |
| Duplicate `.card` and `.sf-card` | globals.css | Consolidate to `.sf-card` |
| Mixed dark mode approaches | Various | Use only CSS variables |
| Hardcoded shadows | Various | Should use shadow tokens |
| DataTable.tsx + DataTable.jsx | components/tables/ | Remove .jsx version |
