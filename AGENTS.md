# Agent instructions

## Project intent

open-personal-tracking is a local-first, user-owned tracking application. Protect portability, offline usefulness, and privacy by default. Do not add an account, network dependency, telemetry, or opaque automated decision without an explicit product decision and documentation update.

## Repository map

- `src/`: core TypeScript domain, storage, search, and history logic.
- `tests/`: Vitest coverage for core behavior.
- `web/`: Next.js 14 presentation prototype. `web/app/app-shell/page.tsx` is the interactive shell; `web/app/globals.css` is its visual system.
- `landing/`: static HTML landing artifacts.
- `docs/`: product and architecture decisions. Treat data-format and portability changes as contract changes.

## Commands

- Core type-check: `npm run build`
- Core tests: `npm test`
- Web production build: `npm run build` from `web/`

Run the narrowest relevant verification after a change. Run both the core checks and the web build when a change crosses `src/` and `web/`.

## Implementation rules

- Keep TypeScript strict. Validate persisted or imported data at the domain boundary with the existing Zod schemas.
- Preserve unknown import fields where the migration policy requires it. Do not silently discard user-owned data.
- Keep domain logic out of React components when it becomes reusable or affects persistence/export behavior.
- Use semantic HTML, keyboard-operable controls, visible focus states, and responsive layouts for UI work.
- Reuse the CSS variables and component patterns in `web/app/globals.css`; do not introduce isolated hard-coded palettes.
- Use the existing local image assets. Do not invent provider metadata, episode descriptions, ratings, or release facts.
- Avoid dependencies unless they solve a concrete need that the existing stack cannot cover.

## Documentation and changelog

- `CHANGELOG.md` is the human-facing release history. Keep `Unreleased` at the top and use only `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or `Security`.
- Changelog entries describe notable user or contributor impact, not a commit-by-commit log. Update the in-app changelog data in `src/domain/changelog.ts` when a released entry changes.
- Update the relevant product, architecture, data-format, or accessibility documentation when behavior or a long-term contract changes.
- Do not present prototype/demo data as persisted product behavior.

## Change hygiene

- Inspect the working tree before editing and preserve unrelated user changes.
- Do not use destructive Git commands or rewrite user-owned files without explicit instruction.
- For external facts, provider terms, product behavior, or current tooling, use primary sources and state boundaries rather than guessing.
