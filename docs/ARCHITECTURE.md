# Architecture

## Architectural goal

open-personal-tracking is designed as a local-first application with optional network services.

The local database is the primary source of truth for personal tracking data.

## High-level architecture

```text
UI
|
Application / Use Cases
|
Domain
|
Repository Interfaces
|
+-- Local SQLite
+-- Backup / Export
+-- Catalog Providers
+-- Optional Network Adapter
```

## Suggested application stack

- React
- TypeScript
- Vite
- Capacitor
- SQLite
- Drizzle ORM
- TanStack Query
- Zod
- Vitest
- Playwright

Targets:

- Web / PWA
- Android
- iOS

## Architectural boundaries

### Domain

Contains business concepts independent of UI, SQLite, APIs, and providers.

Examples:

- Item
- TrackingEntry
- Progress
- Collection
- Tag
- HistoryEntry
- Backup

### Application

Coordinates use cases.

Examples:

- AddItem
- UpdateProgress
- CompleteItem
- ExportBackup
- RestoreBackup

### Infrastructure

Implements external concerns.

Examples:

- SQLite repositories
- TMDB provider
- File export
- Drive backup
- open-personal-tracking Network client

### UI

React components and application screens.

UI components must not access SQLite directly.

## Generic item model

Avoid tables and domain logic tied to a single media category.

Conceptual model:

```ts
type Item = {
	id: string
	type: string
	title: string
	description?: string
	imageUrl?: string
	externalIds: Record<string, string>
	metadata: Record<string, unknown>
	createdAt: string
	updatedAt: string
}
```

Specialized metadata must be normalized at provider boundaries.

## Repository principle

Infrastructure should remain replaceable.

Example:

```ts
interface ItemRepository {
	findById(id: string): Promise<Item | null>
	findAll(): Promise<Array<Item>>
	save(item: Item): Promise<void>
	delete(id: string): Promise<void>
}
```

## Provider architecture

External catalogs enrich user items but must not define their continued existence.

Potential providers:

- TMDB
- Open Library
- AniList
- IGDB
- MusicBrainz
- OpenStreetMap

If a provider disappears, locally stored user data must remain accessible.

## Network boundary

open-personal-tracking Network must be optional.

Core:

```text
local
private
offline-capable
no account required
```

Network:

```text
opt-in
shared
replaceable
non-essential
```

A network outage must not block local tracking.

## Reliability rules

- Migrations must be tested.
- Imports must be transactional.
- Existing data must remain untouched if validation fails.
- Unknown backup fields should not be silently discarded.
- Destructive operations should have explicit confirmation.
- Backups must be versioned.
- Critical persistence workflows require automated tests.

## Complexity rule

Do not introduce distributed systems, event sourcing, CRDTs, or complex sync logic until an actual multi-device synchronization requirement needs them.

Prefer the smallest architecture that protects user data and preserves future migration paths.
