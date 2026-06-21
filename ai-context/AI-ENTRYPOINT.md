# SolarFlow — AI Context Entry Point

## Purpose

This is the single starting point for all AI tools (Cursor, Kiro, Claude Code, GitHub Copilot) working on SolarFlow. Read the referenced documents in the specified order before generating any code.

---

## Read Order (Mandatory)

When working on SolarFlow, load context in this priority:

1. **`14-ai-instructions.md`** — Rules, restrictions, validation checklist
2. **`07-business-rules.md`** — Domain rules that override AI assumptions
3. **`06-workflow.md`** — Workflow engine, stage transitions, integrity guards
4. **`09-design-system.md`** — UI tokens, components, dark mode, mobile rules
5. **`11-coding-standards.md`** — Architecture patterns, naming, error handling
6. **`05-rbac.md`** — Current auth state + target RBAC model

---

## Hierarchy of Truth

```
Source Code (always wins)
    ↓
Business Rules (07-business-rules.md)
    ↓
Workflow Rules (06-workflow.md)
    ↓
Design System (09-design-system.md)
    ↓
Coding Standards (11-coding-standards.md)
    ↓
AI Instructions (14-ai-instructions.md)
```

**If documentation conflicts with source code, source code is correct.** Flag the discrepancy but follow the implementation.

---

## Key Principles

- **Business Rules override AI assumptions.** Never skip workflow validation.
- **Workflow Rules override UI assumptions.** Stage transitions are non-negotiable.
- **Design System overrides generated styling.** Use CSS variables, not hardcoded colors.
- **Organization scoping is mandatory.** Every query must include `organization_id`.
- **Generic errors to clients.** Never expose internal details.

---

## Quick Reference

| Concern | Document |
|---------|----------|
| What is this project? | `01-project-overview.md` |
| What tech is used? | `02-tech-stack.md` |
| Where are files? | `03-project-structure.md` |
| What's the DB schema? | `04-database-schema.md` |
| Who can do what? | `05-rbac.md` |
| How do workflows work? | `06-workflow.md` |
| What are the rules? | `07-business-rules.md` |
| What APIs exist? | `08-api-reference.md` |
| How should UI look? | `09-design-system.md` |
| What are UI patterns? | `10-ui-standards.md` |
| How should code be written? | `11-coding-standards.md` |
| What's broken? | `12-known-issues.md` |
| What's next? | `13-roadmap.md` |
| AI-specific rules? | `14-ai-instructions.md` |
| Long-term vision? | `15-saas-vision.md` |

---

## Before Any Change

✅ Check organization scoping on new queries
✅ Validate UUIDs on entity parameters
✅ Follow service pattern (try/catch/log/rethrow)
✅ Invalidate cache after mutations
✅ Log activity for CRUD operations
✅ Test dark mode compatibility
✅ Verify mobile responsiveness
✅ Use TypeScript strict types
