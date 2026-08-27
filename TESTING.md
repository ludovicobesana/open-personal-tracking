# Testing Strategy

## Goal

Testing exists primarily to protect user history.

## Priorities

Highest-priority areas:

1. persistence
2. migrations
3. backup export
4. restore
5. importers
6. destructive actions
7. offline behavior
8. provider normalization

## Unit tests

Use for:

- domain rules
- validation
- migrations
- normalization
- backup transformations

## Integration tests

Use for:

- repositories
- SQLite migrations
- import transactions
- provider adapters
- filesystem boundaries

## End-to-end tests

Use for critical user workflows.

Mandatory foundational scenario:

1. Create an item.
2. Add progress.
3. Add a rating.
4. Add a note.
5. Add it to a collection.
6. Restart.
7. Verify persistence.
8. Export.
9. Clear local data.
10. Restore.
11. Verify equivalent state.

## Data-loss regressions

Any confirmed data-loss bug should receive a regression test before being considered resolved whenever technically possible.

## Migration tests

Every database and backup migration should have fixtures representing earlier supported versions.

## Offline tests

Core workflows must be exercised without network access.

## Platform coverage

Critical persistence behavior should eventually be verified on:

- Web/PWA
- Android
- iOS
