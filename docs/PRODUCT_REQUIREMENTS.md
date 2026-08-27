# Product Requirements

## Product statement

open-personal-tracking is a local-first personal tracking platform.

It allows people to record what they watch, read, play, listen to, visit, learn, collect, or otherwise want to remember.

## Primary promise

A user's personal history must never depend exclusively on open-personal-tracking's continued operation.

## Product goals

### G1: Personal data ownership

Users must be able to access and export all meaningful personal data at any time.

### G2: Offline usefulness

Core tracking workflows must work without an Internet connection.

### G3: Universal tracking

The system must not be architected only around movies or TV.

### G4: Long-term durability

Data created today should remain understandable and migratable years later.

### G5: Low operational dependency

The core application should not require a proprietary always-on backend.

### G6: Optional community

Social and aggregate features may exist, but they must not be required to use the core product.

## Built-in content categories

Initial or planned first-class categories:

- Movies
- TV Shows
- Anime
- Books
- Manga
- Comics
- Video Games
- Board Games
- Podcasts
- Audiobooks
- Music Albums
- Courses
- Places
- Restaurants
- Events

The system must also support user-defined custom categories.

## Implementation ideas: third-party catalog attribution

When a category is enriched by an external catalog, the UI should credit the source without implying an endorsement relationship. Example, for movies and TV:

> Show and movie information and artwork come from TMDB and TheTVDB. That's their data about titles, not about you. This product uses the TMDB API but is not endorsed or certified by TMDB.

Equivalent attribution will be needed for other categories, using similarly named, freely accessible catalogs:

- Books: Open Library — "Book information and covers come from Open Library. This product uses the Open Library API but is not endorsed or certified by Open Library or the Internet Archive."
- Anime and Manga: AniList — "Anime and manga information and artwork come from AniList. This product uses the AniList API but is not endorsed or certified by AniList."
- Manga (alternative source): MangaDex — "Manga information and cover art come from MangaDex. This product uses the MangaDex API but is not endorsed or certified by MangaDex."

The exact wording, placement, and logo requirements must follow each provider's current attribution and API terms of use at integration time; the phrasing above is a starting point, not final legal text.

## Core user capabilities

Users should be able to:

- Create an item manually
- Search supported external catalogs
- Save an item locally
- Mark status
- Track progress
- Rate an item
- Add private notes
- Add tags
- Add items to collections
- Browse history
- Search local data
- Filter local data
- Export all data
- Restore from backup
- Use core features offline

## Tracking states

Default states:

- Planned
- In progress
- Completed
- Paused
- Dropped

Individual category adapters may expose domain-specific labels while mapping to a generic internal model.

## Progress

Progress must support different domains.

Examples:

- TV: episode 7 of 10
- Book: page 184 of 688
- Manga: chapter 142
- Podcast: episode 41
- Course: 72%
- Game: elapsed hours or manual completion state

The core model must not assume that progress is always episode-based.

## Personal notes vs public comments

Private notes belong to open-personal-tracking Core.

Public comments belong to open-personal-tracking Network.

Private notes:

- local by default
- exportable
- never require an account

Public comments:

- require a network identity
- require moderation
- may be scoped to an item, episode, chapter, season, or discussion context
- must support spoiler-aware display rules where progress can determine safe visibility

## MVP

The MVP should include:

1. App shell
2. Local persistent database
3. Schema migrations
4. Generic item model
5. Generic tracking model
6. Manual item creation
7. Edit and delete
8. Tracking status
9. Simple progress
10. Personal rating
11. Notes
12. Tags
13. Collections
14. Local search
15. Filtering
16. History
17. JSON backup export
18. JSON restore
19. Responsive UI
20. Offline operation
21. Automated end-to-end test of backup recovery

## MVP acceptance scenario

The first milestone is complete when a user can:

1. Create a manual item called `Dune`.
2. Mark it as a book.
3. Set it to `In progress`.
4. Record page 184.
5. Add a rating.
6. Add a private note.
7. Add it to a collection.
8. Close the app.
9. Reopen the app and find the state unchanged.
10. Export a complete backup.
11. Delete the local state.
12. Restore the backup.
13. Recover the same state.

## Explicit non-goals for MVP

Do not implement initially:

- Mandatory accounts
- Cloud sync
- Public profiles
- Comments
- Followers
- Recommendations
- Push notifications
- Complex analytics
- Multiple metadata providers
- Server-side storage of personal libraries

## Success criteria

open-personal-tracking succeeds when a long-term user can leave the project without losing their history.

The ultimate product test is:

> If open-personal-tracking disappeared today, what would the user lose?

For core personal data, the answer should be: nothing.
