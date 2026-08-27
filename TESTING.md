# Testing Strategy

## Goal

Testing exists primarily to protect user history.

## Quality is everyone's responsibility

Testing is not a phase that happens after development, and it is not solely the tester's job. It is an integral part of the software development lifecycle, considered from the very beginning by everyone touching a change.

In practice:

- Discuss testability and edge cases while a feature is being designed, not after it is built.
- Anyone opening a pull request is expected to have thought about how it could fail, not only how it should work.
- Accessibility is a fundamental design consideration, not a checkbox to tick right before release. It is tested alongside a feature, not appended to it.

## Risk-based prioritization

Testing effort should be proportional to the risk a bug poses to user history. Highest-priority areas, in order:

1. persistence
2. migrations
3. backup export
4. restore
5. importers
6. destructive actions
7. offline behavior
8. provider normalization

## Shift-left testing

Find issues as early as possible, when they are cheapest to fix. Prefer, where practical:

- writing or updating a failing test before fixing a bug
- clarifying expected behavior (e.g. via examples or acceptance criteria) before implementation starts
- involving a reviewer or second contributor on risky changes while they are still being designed, not only at review time

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

## Inclusive testing

Software that only works for some users is not done. Accessibility, internationalization, and cross-device behavior are tested as core functionality, not as a separate track:

- Exercise core workflows with a screen reader and keyboard-only navigation.
- Check that dates, numbers, and text handle locales other than the maintainers' own.
- Verify empty, error, and offline states, not only the happy path.

## Automation strategy

Automate what is repetitive and well-understood so that exploratory effort can focus on what automation cannot cover:

- Automate regression coverage for anything already fixed once (see Data-loss regressions below).
- Reserve manual, exploratory testing for new features, ambiguous behavior, and usability.
- A fast, reliable test suite is a testing feature: flaky or slow tests erode the feedback loop and should be fixed or removed, not ignored.

## The modern tester

Testing contributions are not limited to test-writing. Useful testing work includes reading code, understanding architecture, debugging failures to a root cause, and giving concrete feedback on how a change could break. Programming knowledge is not a prerequisite to contribute testing feedback, but it makes that feedback sharper and more actionable — contributors are encouraged to grow it over time.

Testing questions and coordination happen on Discord (https://discord.gg/6CjFPH55Rv) and the weekly community call, 13:00-14:00 (see `docs/WEEKLY_CALL.md`).
