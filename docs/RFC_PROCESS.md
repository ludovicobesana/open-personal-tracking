# RFC Process

## When to use an RFC

Use an RFC for changes that affect the long-term contract of open-personal-tracking.

Examples:

- Backup format changes
- New synchronization architecture
- Authentication
- open-personal-tracking Network protocols
- Public plugin interfaces
- Provider interfaces
- Data collection changes
- Breaking schema changes
- Governance
- Licensing

Do not require an RFC for routine bug fixes.

## RFC template

Create:

```text
docs/rfcs/NNNN-short-title.md
```

Suggested structure:

```markdown
# RFC: Title

## Status

Draft

## Summary

## User problem

## Goals

## Non-goals

## Proposed design

## Data model impact

## Privacy impact

## Offline impact

## Portability impact

## Migration strategy

## Alternatives considered

## Risks

## Open questions
```

## Lifecycle

```text
Draft
|
Discussion
|
Accepted / Rejected / Withdrawn
|
Implementation
|
Completed
```

## Review

RFCs should remain open long enough for meaningful asynchronous participation.

Large architectural proposals should normally be discussed during at least one weekly community call, but call attendance is never required for approval.

## Core test

Every RFC affecting personal data should answer:

> Does this make it harder for users to keep, understand, export, or migrate their own data?
