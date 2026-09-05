# RFC: Browser-local archive persistence

## Status

Draft

## Summary

The web application will store one complete `ArchiveSnapshot` in IndexedDB. IndexedDB is an infrastructure implementation detail behind a browser archive store, not the archive format or a substitute for export and restore.

## User problem

Users need their personal archive to survive reopening the browser without an account, network connection, or provider dependency.

## Goals

- Persist the complete archive locally in the web application.
- Validate snapshots at the persistence boundary.
- Migrate stored snapshots before exposing them to the application.
- Keep browser storage aligned with the portable archive format.

## Non-goals

- Cloud sync, accounts, telemetry, or remote storage.
- Treating IndexedDB as a user backup.
- Splitting the archive into browser-specific stores or duplicating domain query logic.

## Proposed design

`BrowserArchiveStore` owns all IndexedDB access. It writes one record named `current` containing the complete snapshot. On load, it rejects future schema versions, runs the existing migration pipeline, and validates the result before returning it. Invalid data never overwrites the last valid record.

## Data model impact

The portable `ArchiveSnapshot` remains the data contract. The IndexedDB record wraps it with an implementation-only key.

## Privacy impact

Data remains in the browser on the user device. The adapter makes no network requests and collects no telemetry.

## Offline impact

Persistence works without a network connection. Loading the application itself offline is addressed separately.

## Portability impact

Export and restore continue to operate on `ArchiveSnapshot`, not the IndexedDB record. Users are not locked into IndexedDB.

## Migration strategy

Older snapshots are migrated through the domain migration pipeline. Snapshots from a newer schema version are rejected without modifying stored data.

## Alternatives considered

- Local storage: less suitable for a complete archive and has weaker transactional semantics.
- Multiple object stores: adds browser-specific schema and duplicated query logic before it is needed.
- IndexedDB as backup: does not provide a portable, user-controlled recovery file.

## Risks

Browser storage can be cleared by the user or browser. Export and restore remain necessary for data durability.

## Open questions

- Which application use-case interface should own archive mutations before the web shell is connected in issue #44?
