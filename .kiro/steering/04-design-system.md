# SolarFlow — Design System Rules

## Colors (Always Use Variables)

| Token | Light | Dark |
|-------|-------|------|
| --bg | #ffffff | #080f1c |
| --surface | #f8fafc | #111827 |
| --surface-strong | #ffffff | #131a2a |
| --text | #111827 | #e5e7eb |
| --muted | #64748b | #94a3b8 |
| --border | #e5e7eb | #1f2937 |
| --hover | #f3f4f6 | #111827 |
| --primary-start | #2563eb | #3b82f6 |
| --primary-end | #7c3aed | #8b5cf6 |
| --danger | #ef4444 | #ef4444 |

**Never hardcode colors. Always var(--token).**

## Typography

- Font: Inter. H1: 20px/600. H2: 16px/600. H3: 14px/500.
- Body: 14px/400. Secondary: 13px. Labels: 12px/500.

## Spacing

xxs:4 xs:8 sm:12 md:16 lg:20 xl:24 2xl:32 (px)

## Border Radius

sm:10px (buttons/inputs) md:12px (dropdowns) lg:16px (cards/modals)

## Buttons

- Height 40px. Padding 0 16px. Radius 10px. Font 14px/500.
- Primary: gradient(start→end), white. Secondary: surface+border.
- Hover: translateY(-1px). Active: scale(0.98). Disabled: 0.55.

## Inputs

- Height 40px. Padding 0 12px. Radius 10px. Border var(--border).
- Focus: border primary-start + ring rgba(59,130,246,0.16).

## Cards

- Background: var(--surface-strong). Radius: 16px.
- Section cards: add 1px solid var(--border).

## Tables

- Wrap in .table-shell (border, radius 0.75rem, overflow hidden).
- thead: blended bg. th: 12px/500. td: 14px. Padding 16px 20px.

## Dropdowns

- Trigger: 40px like input. Menu: radius 12px, shadow, 160ms fade.
- Items: 12px 16px padding, hover var(--hover).

## Dark Mode

- Class: theme-dark/dark on html. Stored: localStorage.
- Inline head script prevents flash. Test all components both modes.

## Mobile

- Breakpoints: sm:640 md:768 lg:1024 xl:1280.
- Sidebar: drawer on mobile. Touch targets: min 40px.
- Grids: cols-1 → md:cols-2 → xl:cols-4.
- Bottom bar: fixed below md. Content padding-bottom 90px.

## Icons

- Lucide React. Stroke 1.75. 16px buttons, 18px header, 20px sidebar.
