# RFC 0003: Parent and sub-unit tracking

## Status

Draft

## Summary

Sequential media is represented by a generic hierarchy of sub-units owned by
one archive item. Parent progress and completion are derived from leaf units,
so a series, season, chapter group, or other container cannot contradict the
state of the units it contains.

## Decision

Each item can persist `subunits`. A unit has a stable ID, kind, title, optional
parent ID, optional ordering position, current-cycle completion, and an
all-time watch count. Units can be nested; only leaves may carry completion or
watch state.

For an item with at least one leaf unit:

- parent progress is completed leaves over all leaves;
- the parent is completed only when every leaf is completed;
- the parent is in progress after any current or historic leaf watch;
- otherwise the parent is planned.

`watchSubunit` creates a `watched` history entry for the first watch and a
`rewatched` entry for every later watch. Both retain the target sub-unit ID.
When a completed parent is reopened, all leaf `completed` values become false,
parent progress becomes zero, watch counts remain unchanged, and a `reopened`
history entry is added.

## Validation and migration

Archive schema version 2 adds `subunits` and expanded history actions. Version
1 archives migrate with an empty sub-unit list and retain their existing manual
progress. At every parse, import, restore, and persistence boundary the domain
rejects duplicate IDs, missing parents, cycles, and completion state on a
container. It normalizes parent status and progress from valid leaves.

## Alternatives considered

- Independent flags on parent, seasons, and episodes: these allow permanent
  contradictions and cannot determine which state is authoritative.
- A TV-only episode model: this would exclude anime, chapters, courses, and
  future sequential categories.
- Replacing prior history on rewatch: this loses the user-owned record of each
  completed pass.

## Consequences

The portable `ArchiveSnapshot` is now schema version 2. Clients should use the
application operations for watch and reopen actions rather than manually
setting the parent status of a hierarchical item.
