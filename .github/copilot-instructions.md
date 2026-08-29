# Copilot instructions for open-personal-tracking

App summary: a local-first, user-owned tracker for personal items (books, films, games, custom categories) with status/progress history. No mandatory backend or account; data must always be exportable and restorable.

## Non-negotiable product rules

- Local-first: the app must fully function offline with no account. Never gate core features behind a server call.
- User owns the data: every stored entity must be exportable to a documented format and re-importable without loss.
- Generic domain model: model `Item`, `Status`, `Progress` as category-agnostic entities. Category-specific fields (e.g. "pages read", "episodes watched") live in an extensible `attributes` map, never as hardcoded columns/fields on the core model.
- Metadata providers (e.g. book/film APIs) are optional enrichment only. The app must work with providers disabled, and provider data is cached copy, never the source of truth for user history.
- No new network or sync code unless the linked issue explicitly asks for it. Don't add "just in case" sync scaffolding.

## Code style (TypeScript)

- Use explicit domain types, not `any` or loose `Record<string, unknown>` for core entities.

  ```ts
  // Bad
  type Item = { id: string; data: any };

  // Good
  interface Item {
    id: ItemId;
    title: string;
    status: ItemStatus;
    attributes: Record<string, AttributeValue>;
  }
  ```
- Named exports only, no default exports (`export function importItems(...)`, not `export default`).
- Business rules live in `src/domain/**` as pure functions. No `fetch`, `fs`, DB clients, or UI framework imports there.
- Persistence code (`src/storage/**`) only serializes/deserializes; it must not contain business rules (e.g. no "mark as finished if progress === 100" logic in a repository class — that belongs in `domain`).
- Prefer small, single-purpose functions over multi-responsibility ones. If a function needs a comment to explain a section, split it.
- Document assumptions inline when a value is uncertain or externally sourced:
  ```ts
  // Assumption: provider may omit `pageCount`; treat missing as "unknown", not 0.
  ```

## Validation and data integrity

- Validate all data crossing a trust boundary (file import, provider response, IPC) with a schema (e.g. Zod) before it enters domain logic.
- Fail loudly: reject invalid data with a specific, actionable error (which field, which value, why). Never silently coerce or drop invalid fields.

  ```ts
  const result = ItemSchema.safeParse(raw);
  if (!result.success) {
    throw new InvalidItemDataError(result.error.issues);
  }
  ```

## Data format changes and migrations

- Every stored data format has a `schemaVersion` field. Bumping the shape requires a new version number.
- Every format change ships with: a migration function `migrate_vN_to_vN+1`, a test with a fixture of real v(N) data, and a round-trip test (migrate then export must not lose fields the user didn't ask to drop).
- Prefer additive, incremental migrations. A destructive rewrite (dropping/renaming fields outright) requires an explicit note in the PR description explaining why an incremental path isn't possible.
- Never remove a migration step for a version that may exist in a user's exported file, even if no current code writes that version anymore.

## Testing expectations

- Required tests: migrations (old fixture in, new shape + no data loss out), validation (valid and invalid fixtures), and edge cases named in the issue (empty state, partial/missing provider data, duplicate imports).
- Domain logic tests must not require a database, filesystem, or network — pure input/output only.

## Things to avoid

- Don't hardcode category-specific fields on the core `Item`/`Status` model.
- Don't put persistence or UI concerns inside `src/domain/**`.
- Don't add a mandatory account, license check, or telemetry call to core flows.
- Don't silently swallow or auto-fix invalid imported data.
- Don't introduce a new external dependency for something solvable with a small pure function, unless it's a schema/validation library already in use.
