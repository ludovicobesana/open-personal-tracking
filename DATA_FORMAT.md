# Data Format

## Purpose

The open-personal-tracking data format is a public contract for representing user-owned tracking data.

It should be possible to read exported data without running the official application.

## Naming

`open-personal-tracking` is a working project name.

The data format identifier should remain stable once publicly released, even if the final product name changes.

Before format version 1 is declared stable, the project should decide whether the identifier should remain:

```text
open-personal-tracking
```

or use another permanent neutral identifier.

## Current backup shape

Backups currently serialize the complete, versioned `ArchiveSnapshot` directly:

```json
{
  "schemaVersion": 2,
  "exportedAt": "2026-08-27T00:00:00.000Z",
  "items": [],
  "collections": [],
  "history": [],
  "preferences": {}
}
```

Restore rejects backups from a future schema version. It migrates supported legacy snapshots and validates the result before replacing local data.

## Parent and sub-unit tracking

Items may include a `subunits` hierarchy for sequential media. A sub-unit has a
stable `id`, a `kind` (`season`, `episode`, `chapter`, or `unit`), a title,
and an optional `parentId`. A season is a container; episodes and chapters are
normally leaves.

Only leaf sub-units persist current-cycle completion (`completed`) and an
all-time `watchCount`. Container state is never stored independently. For an
item with sub-units, the archive derives its parent state as follows:

- `progress.current` is the number of completed leaves;
- `progress.target` is the total number of leaves;
- the parent is `completed` only when every leaf is completed;
- it is `in_progress` after any current or previous watch; otherwise it is
  `planned`.

Reopening a completed parent clears `completed` on every leaf and sets parent
progress to zero, but preserves every `watchCount` and history entry. A later
watch of a previously watched leaf creates a distinct `rewatched` history
entry. Invalid hierarchies (duplicate IDs, missing parents, cycles, or state on
container units) are rejected at import and persistence boundaries.

## Requirements

The format must be:

- versioned
- documented
- human-readable
- deterministic where practical
- validated
- migratable
- sufficiently complete to restore user-owned state

## User-owned data

The format should include all meaningful local data such as:

- items
- tracking state
- progress
- personal ratings
- notes
- tags
- collections
- history
- custom metadata
- custom item types

## External metadata

Provider metadata may be included where useful, but provider availability must not determine whether the user's tracked item remains understandable.

## Unknown fields

Importers should preserve unknown fields where technically reasonable.

Unknown data must never be silently discarded during migrations.

## Versioning

Breaking format changes require:

- documented migration
- automated migration tests
- changelog entry
- compatibility statement
- RFC approval once the format is stable

## Interoperability goal

Third-party software should eventually be able to:

- parse exports
- create compatible exports
- inspect user history
- build migration tools
- build alternative clients

without reverse engineering the official application.
