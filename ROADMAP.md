# Roadmap

The roadmap is directional, not a promise of delivery dates.

## Milestone 0: Foundation

- Repository setup
- CI
- Formatting and linting
- Test infrastructure
- Documentation
- Contribution guidelines
- Issue templates
- Governance baseline

## Milestone 1: Local-first proof

- Generic item model
- Local persistence
- Tracking status
- Progress
- Ratings
- Notes
- Collections
- Tags
- History
- JSON export
- JSON restore
- Backup migrations
- Offline operation
- End-to-end restore scenario

## Milestone 2: Media provider

- Provider abstraction
- TMDB integration
- Movie search
- TV search
- Poster and metadata caching
- Provider failure behavior

## Milestone 3: Broader tracking

Candidate integrations:

- Open Library
- AniList
- IGDB
- MusicBrainz

Improve custom item types.

## Milestone 4: Backup ecosystem

- File backups
- Scheduled local backup where platform permits
- Google Drive
- Additional user-controlled storage
- Backup integrity checks

## Milestone 5: Import ecosystem

Candidate importers:

- TV Time
- Trakt
- Letterboxd
- Goodreads
- StoryGraph
- MyAnimeList
- AniList

TV Time and Trakt should be treated as higher priority than the rest of this list. Per `docs/COMPETITIVE_ANALYSIS.md`, no reviewed self-hosted alternative imports directly from TV Time (everyone routes through Trakt as an intermediary), and Trakt already functions as the de facto hub the rest of the ecosystem connects through.

## Milestone 6: Personal insights

All generated locally where possible.

- Year review
- Completion trends
- Personal rating distributions
- Timeline
- Category summaries

## Milestone 7: open-personal-tracking Network alpha

- Explicit opt-in
- Minimal aggregate events
- Global ratings
- Popularity
- Trends
- Public aggregate API or datasets

## Milestone 8: Community features

Only after moderation infrastructure exists.

- Network profiles
- Public lists
- Comments
- Spoiler scopes
- Reactions
- Reporting
- Blocking
- Moderation tooling

## Milestone 9: Ecosystem

- Provider SDK
- Importer SDK
- Public data-format libraries
- Third-party apps
- Self-hostable network components where practical

## Notes from external research

Findings that aren't yet assigned to a milestone but should inform how the milestones above are actually built:

- **Consistent episode/season granularity everywhere.** Several reviewed alternatives track TV shows correctly but downgrade anime to a coarse in-progress/completed toggle. The generic tracking model (Milestone 1) must guarantee the same granularity across every episodic category. See `docs/COMPETITIVE_ANALYSIS.md`.
- **Rewatch as discrete history entries.** Model each watch/rewatch as its own `History` entry from the start (Milestone 1), not a single boolean added later. A well-known competitor has carried an unresolved rewatch bug for 5+ years because of exactly this shortcut. See `docs/COMPETITIVE_ANALYSIS.md`.
- **A single source of truth across an item and its sub-units.** Marking a show finished must not leave its seasons or episodes in a contradictory state. Worth a dedicated regression test in Milestone 1.
- **Global, incremental search, not siloed per category** (relevant to Milestone 2 and 3 as more providers are added).
- **"What should I watch next" as the home pattern**, not a flat, ungrouped item list. See `docs/reference/TVTIME_REFERENCE.md` for the reasoning behind TV Time's own home screen.
- **In-app roadmap visibility** (this file, surfaced inside the app) as a low-cost trust signal, candidate for Milestone 6 or later.
- **Optional "where to watch" data**, strictly opt-in and non-blocking per the network boundary principle in `docs/ARCHITECTURE.md`, if pursued at all.
