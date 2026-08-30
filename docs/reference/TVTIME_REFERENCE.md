# Reference: TV Time Information Architecture

## Provenance

This document reconstructs the information architecture and feature set of the last generation of the original TV Time app (Whip Networks, roughly 2023 to June 2026), cross-referencing the official Google Play listing, historical screenshots, the app's internal string resources, and articles showing the real UI.

TV Time changed its UI several times over its life. This reconstruction intentionally focuses on one generation to avoid mixing incompatible versions; where a screen is also documented by older screenshots, that is noted inline in the original research.

This is reference material for future roadmap discussion, not a build spec. Nothing here is committed to; see `ROADMAP.md` for what has actually been prioritized.

## Screen map

Primary navigation in recent versions was: **Shows | Movies | Explore/Discover | Profile**. Internal app strings confirm: Shows, Movies, Explore, Discover, Feed, Groups, Activity, Profile.

### 1. Shows

One of the main screens, with at least two tabs:

- **Watch List**, itself split into: Watch Next, Haven't watched for a while, Haven't started, Watch later, Favorites, Stopped, Finished, Watching, Up to date, Watched history
- **Upcoming**: future episodes grouped by time (Today/Tomorrow/day), with network/channel, air time, season + episode, and episode title

These labels come directly from the app's own resources, not inference. The Watch List could be viewed as a card list or a poster grid. Progress was shown via a yellow bar. A card could jump straight to the next episode to watch, and in some versions let the user mark it watched directly.

### 2. Movies

The film equivalent of Shows:

- **Watch List**: saved films to watch, with poster/thumbnail, title, duration, genres, a watched/mark action, and a "Browse All Movies" entry point at the bottom
- **Upcoming**: films the user added that haven't been released yet

Confirmed strings: `movies_watch_list_empty_title` ("Add movies you want to watch", "Browse all movies"), `movies_upcoming_empty_title`.

### 3. Global search

Search covered more than titles. The UI showed at least **Shows & Movies | Users**, and in some versions **Groups**. Results showed poster, title, and a count of how many users had added that title, with a `+` button to add it directly. Confirmed strings include `Shows & movies`, `Users`, `Filters`, `Advanced`, `Reset`, `Apply`, plus friend search via contacts/Facebook/X.

### 4. Discover / Explore

The editorial/recommendation surface:

- Top shows for you, Trending shows, Trending movies, Popular in your country, Browse all shows, Browse all movies, Community activity, Discover more

TV Time's own marketing described personalized recommendations based on history, globally trending content, browsing by genre, browsing by status, and personal statistics. Browse-all supported at least genre and status (e.g. ongoing vs. finished) filters. Historically there were also "most binged"/popular classifications.

### 5. Show detail page

Richer than a typical metadata page. A hero section (backdrop, title, season count, network, TV Time rating/percentage, a `...` menu) sat above two tabs: **About | Episodes**.

**About** contained:
- Where to watch (platform availability, officially documented by TV Time)
- Show info (genres, synopsis, network, season count, episode runtime, status, air period) — confirmed strings: `Show info`, `Season`, `min`, `Present`, `Finished`, `Up to date`
- Watch trailer
- Personal status, one of: Haven't started, Watching, For later, Stopped, Up-to-date, Finished, with matching CTAs (Add show, Start watching, Resume watching, Watch later, Stop watching)

### 6. Show detail, Episodes tab

One of the most distinctive screens. At the top, a **Watch Next / Continue Tracking** card for the next episode (season/episode number, title, a checkmark action). Below, **All Episodes**, organized by season with a completion count (e.g. "Season 1 — 17/17"), each episode listed with title and a checkmark; an entire season could be marked watched at once.

Confirmed strings: `Continue tracking`, `Start tracking`, `All episodes`, `x/y`, `Mark as`, `Watched once`, `Rewatched`, `Watch all`, `Unwatch all`, `Mark previous episodes?`. Rewatch was explicitly supported, not just watched/unwatched.

### 7. Episode detail page

A full screen, not just a row: show, season/episode, title, original air date, synopsis, watched state, rating, comments. After marking an episode watched, a social/reaction flow unlocked:

- **Rate this episode**
- **How did you feel?** (reaction/emotion)
- **Who was your favorite?** (favorite character)
- **Where did you watch?** / **How did you watch?** (platform and viewing mode)

### 8. Episode comments / community

A full social layer under episodes and movies: text comments, images, GIFs, memes, likes/reactions, and sort order (**Most liked**, **Most relevant**). Strong spoiler handling: an unwatched episode showed "Spoilers ahead!" with the choice to mark it watched first or "Display anyway," plus a **No spoilers** filter that only showed comments tied to already-watched content. TV Time also let users create memes directly from content.

### 9. Movie detail page

Structurally similar to the show detail page minus the Episodes tab: hero/backdrop, title, rating, About, More, Feed, Movie info, Watch trailer, rating count, Add movie, Customize. Included synopsis, runtime, genres, release info, where to watch, and personal watched state. "Find where to watch" was an explicitly marketed feature.

### 10. Post-watch interaction (movies)

Same reaction flow as episodes: mark as watched, rewatched, rating, feeling, favorite character, comments/review, spoiler protection, gated behind a "Watched this movie?" dialog before rating is possible.

### 11. Custom lists

Beyond the default Watch List, users could create named lists, add shows and movies to them (mixed), share them, or hide them from their profile. Confirmed strings: `Create list`, `Save changes`, `Hide from profile`. Lists were officially documented as shareable.

### 12. Profile

Much more than an account page: cover image, avatar, username, Edit button, total TV Time (and in hours), Episodes Watched, Movie Time (and in hours), Movies watched, Followers, Following, Comments, Lists, plus poster grids for shows/movies and the personal watch list. Older versions also had visual per-genre statistics.

### 13. Favorites

A separate favorites list from normal tracking status. Confirmed strings: `Add favorite shows`, `Add favorite movies`, `Add/Remove shows`, `Add/Remove movies`, `Favorite`.

### 14. Feed / Activity / Groups

A genuine social-network layer: Feed, Groups, Activity, Community Activity. Discover also surfaced community and (historically) friend activity such as newly followed shows.

### 15. Other users' profiles

Strongly implied by app strings (`{user}'s stats`, `{user}'s followers`, `{user}'s following`, `{user}'s comments`, `{user}'s lists`): a public profile showed the same categories as one's own, and Users were directly searchable.

### 16. Notifications

An in-app notification center plus push notifications, covering new episodes, upcoming movie releases, and pre-broadcast reminders ("New episode starting in one hour," per onboarding copy). Google Play confirms alerts for new episodes and movies.

### 17. Widgets

Watch List and Upcoming Shows were available as home/lock-screen widgets in the recent generation; iOS historically had at least a legacy Upcoming-episodes widget.

### 18. Custom poster / artwork

A real, distinctive feature: custom posters and artwork for shows and movies, officially documented, and confirmed by a verified 2026 review that also mentions changing banners.

### 19. Badges

A gamification layer: badges earned for watching content, rating, and community interaction.

### 20. Onboarding

Asked the user to pick followed shows, pick movies to watch, reconstruct current progress, and allow notifications, explicitly in service of building "your calendar and improve your recommendations."

## Reconstructed information architecture

```text
App
├─ Shows
│  ├─ Watch List
│  │  ├─ Watch Next
│  │  ├─ Haven't watched for a while
│  │  ├─ Haven't started
│  │  ├─ Watch later
│  │  ├─ Watching
│  │  ├─ Up to date
│  │  ├─ Finished
│  │  └─ Watched history
│  └─ Upcoming
├─ Movies
│  ├─ Watch List
│  └─ Upcoming
├─ Explore / Discover
│  ├─ Search
│  │  ├─ Shows & Movies
│  │  ├─ Users
│  │  └─ Groups
│  ├─ Top Shows For You
│  ├─ Trending Shows
│  ├─ Trending Movies
│  ├─ Popular in your country
│  ├─ Browse all Shows
│  ├─ Browse all Movies
│  └─ Community Activity
└─ Profile
   ├─ Shows
   ├─ Movies
   ├─ Favorites
   ├─ Lists
   ├─ Stats
   ├─ Comments
   ├─ Followers
   ├─ Following
   ├─ Notifications
   └─ Settings
```

Detail flows:

```text
Show
├─ About
│  ├─ Where to watch
│  ├─ Show info
│  ├─ Trailer
│  └─ Personal tracking state
└─ Episodes
   ├─ Watch Next
   ├─ Seasons
   └─ Episode
      ├─ Info
      ├─ Watched/Rewatched
      ├─ Rating
      ├─ Feeling
      ├─ Favorite character
      ├─ Where/how watched
      └─ Comments

Movie
├─ About
│  ├─ Where to watch
│  ├─ Movie info
│  └─ Trailer
├─ Add / Mark watched / Rewatched
├─ Rating
├─ Feeling
├─ Favorite character
├─ Feed / Comments
└─ Lists / Favorites
```

## Feature inventory

| Feature | TV Time |
|---|---|
| Show list | Yes |
| Movie list | Yes |
| Watch Next | Yes |
| Watch Later | Yes |
| Upcoming episodes | Yes |
| Upcoming movies | Yes |
| Episode tracking | Yes |
| Season tracking | Yes |
| Rewatch | Yes |
| Movie search | Yes |
| Show search | Yes |
| User search | Yes |
| Social/group search | Yes, in some versions |
| Discover | Yes |
| Trending | Yes |
| Recommendations | Yes |
| Browse by genre | Yes |
| Browse by status | Yes |
| Movie detail | Yes |
| Show detail | Yes |
| Episode detail | Yes |
| Where to watch | Yes |
| Trailer | Yes |
| Movie rating | Yes |
| Episode rating | Yes |
| Reactions/feelings | Yes |
| Favorite character | Yes |
| Comments | Yes |
| GIFs/images/memes | Yes |
| Spoiler protection | Yes |
| Custom lists | Yes |
| Shareable lists | Yes |
| Favorites | Yes |
| Public profile | Yes |
| Following/followers | Yes |
| Stats | Yes |
| Notification center | Yes |
| Release push notifications | Yes |
| Widgets | Yes |
| Custom posters | Yes |
| Badges | Yes |

## The key insight

A faithful reimplementation isn't "watchlist plus movie detail page." TV Time's real model was:

> tracking state + next action + release calendar + social reaction

That combination, not any single screen, is what distinguished it from Letterboxd/TMDB-style apps. Its home screen was never a static library: it was continuously trying to answer "what should I watch next?"

## Why this matters for open-personal-tracking

We are not TV Time, and several of the above (the social/follower graph, badges, custom banners) sit well outside what `docs/PRODUCT_REQUIREMENTS.md` scopes for the core, account-free product, if they belong at all. But a few structural ideas are worth carrying forward, scoped appropriately:

- The "what should I watch next" home pattern (Watch Next surfaced prominently, not just a flat list) is a strong, proven answer to the exact question our own `DESIGN_PRINCIPLES.md` asks under "Personal history over discovery."
- Rewatch as a first-class, explicitly modeled concept (not bolted on) is validated both here and by the Showly bug documented in `docs/COMPETITIVE_ANALYSIS.md`.
- Spoiler-aware comments and reactions map to the already-planned `open-personal-tracking Network` milestones (community features, spoiler scopes) rather than the local-first core.
- Custom lists (shareable, hideable) fit naturally as an extension of the existing Collections capability.

See `ROADMAP.md` for what, if anything, has been folded in from this reference.
