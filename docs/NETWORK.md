# open-personal-tracking Network

## Purpose

open-personal-tracking Network is the optional shared layer of the open-personal-tracking ecosystem.

It must never become a requirement for using open-personal-tracking Core.

## Potential capabilities

- Aggregate ratings
- Popularity
- Trends
- Public comments
- Reactions
- Public lists
- Public profiles
- Following
- Discovery
- Recommendations
- Open aggregate datasets

## Data sharing modes

### Private

Nothing from local tracking activity is contributed to open-personal-tracking Network.

This must be the default.

### Anonymous contribution

The user explicitly opts in to contributing selected minimal tracking activity to aggregate statistics.

### Social

The user intentionally creates a network identity and chooses what becomes public.

## Data minimization

Never upload a user's full local database merely to compute global statistics.

A shared event should contain only what is necessary.

Conceptually:

```ts
type SharedTrackingEvent = {
	provider: string
	externalId: string
	eventType: 'started' | 'completed' | 'dropped' | 'rated'
	rating?: number
	occurredAt: string
}
```

## Comments

Comments are a Network feature.

Potential scopes:

- Item
- Season
- Episode
- Volume
- Chapter
- General discussion

## Spoilers

Spoiler-awareness should be part of the model rather than a cosmetic flag added later.

Where possible, open-personal-tracking can use local progress to determine whether a discussion is safe to display.

Example:

A user at S02E02 should not automatically see unhidden discussion for S02E04.

## Moderation

Public comments imply operational responsibilities.

Before comments are enabled, the project must have:

- reporting
- moderation roles
- spam controls
- rate limits
- blocking
- deletion and appeal policies
- community guidelines
- incident handling

## Open aggregate data

Where privacy permits, open-personal-tracking should consider publishing aggregate datasets.

Examples:

- Starts per item
- Completions per item
- Drop rates
- Rating distributions
- Popularity trends

Published data must be sufficiently aggregated to avoid exposing individual user activity.

## Failure principle

If open-personal-tracking Network is shut down:

- local libraries continue working
- personal ratings remain
- notes remain
- history remains
- collections remain
- backups remain usable

Only network-dependent features disappear.
