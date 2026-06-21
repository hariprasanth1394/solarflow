# SolarFlow — UI Rules

## Page Structure

- Use PageContainer (title, subtitle, breadcrumbs)
- Use ContentArea to wrap content sections
- Use FilterBar above lists (search + filters)
- Stats grid → charts → tables → supplementary panels

## Header

- Sticky, 64px height, backdrop-blur.
- Contains: hamburger (mobile), search, theme toggle, user dropdown.
- Sub-navigation bar (48px) when top bar content injected.

## Action Bars

- Primary action: right-aligned, btn-primary (gradient).
- Secondary actions: btn-secondary.
- Never stack multiple primary buttons side-by-side.
- Mobile: full-width in modals/forms, bottom bar for page actions.

## Tables

- Use DataTable component (TypeScript version only).
- Always include: row count, pagination, sort, search.
- Empty state: centered illustration + CTA.
- Mobile: horizontal scroll or card transformation.
- Actions column right-aligned. Status uses StatusBadge.

## Forms

- Use FormField wrapper (label + error display).
- Inputs: FormInput, FormSelect, FormTextarea.
- Validation errors: red text below field + shake animation.
- Submit button: full-width on mobile, right-aligned on desktop.
- Never clear form on error — preserve user input.

## Modals

- Use AppModal. Sizes: 400/520/640/90vw.
- Structure: Header (title + X) → Body (scroll) → Footer.
- Footer: secondary left, primary right.
- Mobile: full-screen below sm breakpoint.
- Escape closes. Click outside closes (unless dirty form).

## Status Badges

- Completed: green. Active: violet. Pending: slate.
- Warning: amber. Error: rose.
- Use StatusBadge component.

## Loading States

- Page load: centered spinner.
- Section: inline spinner + text.
- Button: LoadingButton (spinner + "Saving...").
- Lists: skeleton loaders matching content shape.
- Show loading within 100ms of action start.

## Error States

- Form: field-level red text + shake (180ms).
- API: toast notification or inline Alert.
- 404: full-page EmptyState with back button.
- Always provide recovery path (retry, back, contact).

## Empty States

- Use EmptyState component.
- Structure: icon (48-64px) → title → description → CTA button.
- Always include actionable CTA.

## Success States

- Toast auto-dismiss 3-5 seconds.
- Redirect after creation.
- Never block UI with success modals.

## Mobile Behavior

- Sidebar: full-screen drawer (slide-in).
- Bottom bar: fixed, 3-column grid, below md only.
- Touch targets: minimum 40px × 40px.
- Content padding-bottom: 90px (for bottom bar).
- Tables: card layout or horizontal scroll.
