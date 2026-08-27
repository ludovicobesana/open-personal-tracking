# Issue Triage

## Purpose

Issue triage keeps the project understandable and prevents the backlog from becoming an unstructured wishlist.

## Labels

Recommended initial labels:

### Type

- `bug`
- `feature`
- `enhancement`
- `documentation`
- `design`
- `accessibility`
- `performance`
- `security`
- `question`

### Area

- `area:core`
- `area:storage`
- `area:backup`
- `area:import`
- `area:provider`
- `area:web`
- `area:ios`
- `area:android`
- `area:network`
- `area:community`

### Status

- `needs-triage`
- `needs-info`
- `ready`
- `blocked`
- `needs-rfc`
- `in-progress`

### Contributor

- `good first issue`
- `help wanted`

### Priority

Use priority labels sparingly:

- `priority:critical`
- `priority:high`
- `priority:normal`
- `priority:low`

Critical is reserved primarily for:

- data loss
- corruption
- unrecoverable migration failures
- serious security issues
- broken backup restore

## Weekly triage

Before the weekly call, maintainers should review new issues and identify:

- duplicates
- missing reproductions
- regressions
- data safety risks
- candidates for good first issues
- issues that need an RFC

## Triage questions

For each issue:

1. Is the problem reproducible?
2. Does it threaten user data?
3. Is it core or network?
4. Does it introduce lock-in?
5. Is the expected behavior documented?
6. Is an architectural decision required?
7. Is the issue small enough to implement directly?
8. Does it need platform-specific validation?

## Stale issues

Do not automatically close issues solely because nobody commented recently.

Long-lived open-source projects often have valid issues that wait for contributors.

Close issues when they are:

- fixed
- invalid
- duplicates
- no longer relevant
- impossible to act on after reasonable attempts to obtain required information
