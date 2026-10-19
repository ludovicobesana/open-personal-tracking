---
description: 'Web UI and accessibility rules for the Next.js presentation layer'
applyTo: 'web/**/*.{ts,tsx,css}'
---

# Web implementation rules

- Keep reusable behavior and persistence-facing rules outside React components.
- Use semantic HTML, labelled controls, keyboard-operable interactions, visible focus states, and text alternatives for visual summaries.
- Reuse the variables and component patterns in `web/app/globals.css`; avoid isolated palettes and unnecessary dependencies.
- Keep local-first behavior intact: optional providers must never be required for core flows.
- Cover responsive behavior at narrow and wide viewports when layout changes.
- Prefer CSS and existing utilities for small visualizations; add a library only when it materially improves accessibility or maintainability.

Validate web changes with `npm run build --prefix web`, `npm run lint --prefix web`, and the smallest relevant Playwright test.
