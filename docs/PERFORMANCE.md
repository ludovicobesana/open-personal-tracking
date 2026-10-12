# Performance budgets

The project protects the local-first archive with synthetic performance checks. The fixtures contain no real user data, provider data, credentials, or network calls.

## Profiles

- Typical: 1,000 items and 5,000 history entries.
- Large: 5,000 items and 25,000 history entries.
- Import: a 500-row synthetic IMDb export applied to a typical archive.

The fixtures intentionally include notes, tags, collections, attributes, progress, and imported-style history so the measured operations resemble a long-lived personal archive without committing a user export.

## Budgets

The budgets are wall-clock upper bounds for the complete operation in the Node test runner. They are deliberately broad enough for shared CI runners and are enforced by `npm run test:performance`.

| Scenario | Budget |
| --- | ---: |
| Typical search | 250 ms |
| Typical filter | 500 ms |
| Typical sort | 500 ms |
| Typical history timeline | 500 ms |
| Large search | 1,500 ms |
| Large filter | 2,500 ms |
| Large history timeline | 2,500 ms |
| Import preview | 2,000 ms |
| Import application | 2,000 ms |

The production browser smoke budget is 10,000 ms for startup, 10,000 ms for
restoring 1,000 synthetic items, and 2,000 ms for a library search after the
restore. Run it with `npm run test:performance:browser` after installing the
Playwright Chromium browser.

The recorded duration is reported by the failing test through Vitest. A failure identifies the operation and its budget while the fixture remains synthetic.

## Measurement boundary

These checks cover pure domain search/history operations and the import preview/application path. They do not claim to measure browser startup, IndexedDB transaction latency, rendering, or network performance. Stateful browser measurements and Lighthouse CI should be added before release certification; Lighthouse alone is not sufficient for the archive workflows.

The browser smoke test covers production startup, public backup restore, and
library search. It uses the same public import flow as a person and a synthetic
1,000-item backup, but it does not inspect archive contents outside the page
under test.

The checks run offline and do not add accounts, analytics, remote monitoring, or production instrumentation.
