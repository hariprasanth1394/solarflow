# SolarFlow — AI Steering Entry Point

## Before Any Code Change

Read these files from `ai-context/` in order:
1. `14-ai-instructions.md` — Rules, restrictions, validation checklist
2. `07-business-rules.md` — Domain rules (override AI assumptions)
3. `06-workflow.md` — Stage transitions, guards, integrity
4. `09-design-system.md` — UI tokens, dark mode, mobile
5. `05-rbac.md` — Current auth + target role model
6. `11-coding-standards.md` — Patterns, naming, error handling

## Priority Order

```
Business Rules > Workflow Rules > RBAC Rules > Design System > Coding Standards
```

## Absolute Rules

- Documentation overrides AI assumptions
- Codebase is source of truth (if docs conflict with code, follow code and flag discrepancy)
- Never create duplicate workflows or components
- Never introduce inconsistent UI patterns
- Never bypass workflow validation
- Never remove organization scoping from queries
- Never expose internal error details to clients

## Validation Before Submitting

- [ ] Organization scoping present on all new queries
- [ ] UUID validation on entity ID parameters
- [ ] Error handling follows service pattern (try/catch/log/rethrow generic)
- [ ] Cache invalidated after mutations
- [ ] Activity logged for CRUD operations
- [ ] Dark mode tested
- [ ] Mobile responsive (375px minimum)
- [ ] TypeScript strict (no untyped code)
