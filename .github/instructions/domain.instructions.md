---
description: 'Domain and persistence rules for Open Personal Tracking TypeScript'
applyTo: 'src/**/*.ts,tests/**/*.ts'
---

# Domain and persistence rules

- Keep business rules as pure functions in `src/domain/**`.
- Use explicit exported types; do not introduce `any` or broad untyped records for domain entities.
- Validate imported, persisted, provider, and IPC data with the existing Zod schemas before domain logic.
- Treat `schemaVersion`, migrations, backup, import, and export as compatibility contracts.
- Preserve user-owned fields and fail with actionable errors instead of silently coercing or dropping data.
- Keep domain tests independent of network, filesystem, browser, and database state.
- For behavior changes, add focused tests for valid input, invalid input, empty state, and the edge cases named by the issue.

Before editing, inspect the nearest existing helper and test for prior art. Run the narrowest relevant test command, then `npm run build` when TypeScript types or public behavior changed.
