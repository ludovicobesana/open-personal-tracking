# Competitive Analysis: Self-Hosted TV Time Alternatives

## Context

Following TV Time's shutdown, an italian Youtuber called [Davide Bilardello](https://www.youtube.com/@davidebilardello_dev) reviewed five actively maintained self-hosted tracker projects found on GitHub (installed locally via Docker), plus two hosted services mentioned for context. This document distills that review into concrete lessons for open-personal-tracking. See [`WHY.md`](../WHY.md) for the broader narrative this sits inside.

This is qualitative, single-session feedback, not a systematic audit. Treat specifics as a starting point for verification, not settled fact.

## The five self-hosted apps reviewed

| App | Strengths | Problems found |
|---|---|---|
| **Yamtrack** | Simple dashboard, broad category coverage (movies, anime, manga, games, custom entries), rich stats (streak, GitHub-style history graph, category distribution) | Home/dashboard unreliable (planned items don't show up); search is siloed per media type; **anime can only be marked "in progress/completed," no per-episode tracking**; duplicate entries between the anime and TV sections with inconsistent capabilities |
| **Ryot** | Covers even more categories (music, visual novels, comics) | Requires manual API keys before search works at all; same **broken per-episode anime tracking** as Yamtrack; season/episode marking buried behind a "Seasons" tab; dashboard unreliable; an entire unrelated fitness/workout module (44 pages of exercises) dilutes focus and its own stats page |
| **Watchr** | Nicer visual design, live search-as-you-type (clearly better than static search elsewhere) | Status inconsistency between a show and its seasons/episodes (marking a show "finished" doesn't cascade down); status-color coding on cards applied inconsistently; tag filters can't be cleared, no way back to an unfiltered view; no grouping on the home screen, everything dumped together |
| **Hound** | Stats, activity feed, calendar | Positioned more as a Jellyfin-style media server than a pure tracker (play button looks for a stream and needs external configuration); no default watchlist, must be built manually; watched items disappear from home, only "continue watching" remains visible |
| **New/unnamed app** (fewest stars, actively developed, openly AI-assisted) | Pleasant UI, stats and "continue watching" visible immediately, **only one of the five with an in-app "coming soon" roadmap section**, **correct episode- and season-level tracking that actually works**, asks which streaming platforms the user uses to eventually suggest where to watch | No rewatch support yet (actively being developed); one Italian translation bug found |

The reviewer's conclusion: the newest, least-starred app was the most promising of the five, specifically because it got the fundamentals right (tracking granularity, working dashboard, visible roadmap) while the more established ones remain stuck on long-standing structural bugs.

### Context: hosted alternatives mentioned

- **Trakt**: not self-hosted, but functions as the ecosystem's de facto import/export hub; most other tools (including several above) sync to or from it. Has the deepest free feature set (rewatches, lists, social, following).
- **Showly**: the reviewer's top pick "right now," closest in spirit to TV Time, syncs to Trakt's cloud. Known limitation, open as a GitHub issue for 5+ years: it cannot support rewatch un-marking, because it has no way to disambiguate which watch instance to remove when Trakt allows multiple rewatches.

## What this means for open-personal-tracking

1. **Episode-level granularity must be consistent across every episodic category, not just TV.** Two of the five tools handle TV shows correctly but downgrade anime to a coarse "in progress / completed" toggle. Our generic tracking model should guarantee the same granularity for anime, TV, and any other episodic category, not treat TV as a privileged special case. Worth an explicit acceptance criterion, not an assumption.

2. **State must have one source of truth across an item and its sub-units.** Watchr's bug (marking a show "finished" without it propagating to seasons/episodes) is a data-model problem, not a UI one. Our `TrackingEntry` model needs to make that kind of contradictory state structurally impossible, and this deserves a dedicated regression test.

3. **The home/dashboard is the most common and most damaging failure point.** Three of five tools have items that silently vanish from the home view despite being tracked. This reinforces `TESTING.md`: "I add an item, I return to the home screen, I see it" should be an explicit end-to-end scenario, not an assumption.

4. **Search should be global and incremental, not siloed per category.** Yamtrack and Ryot force separate searches per media type; Watchr's live search-as-you-type was the one clearly-praised interaction. Our "Search supported external catalogs" capability should be a single, incremental search across categories.

5. **Zero-config is a real competitive advantage.** Ryot requiring manual API keys before search works at all validates our own MVP non-goal of avoiding multiple metadata providers up front: ship with one provider that works out of the box.

6. **Guard against scope creep.** Ryot's disconnected fitness/workout module (which even breaks its own stats page) is a cautionary tale for our "universal tracking" principle (`docs/PRODUCT_REQUIREMENTS.md` G3): universal should mean disciplined coverage of genuinely trackable media/experience categories, not an everything-app.

7. **Trakt is a high-leverage import/export target.** It's already listed as a candidate importer in `ROADMAP.md` Milestone 5; this review is direct evidence that supporting it early would connect us to most of the existing ecosystem (Showly, Sofa Time, and others already sync through it) rather than starting isolated.

8. **A direct TV Time importer is still an open gap in the whole ecosystem.** None of the five self-hosted tools reviewed import directly from TV Time; everyone routes through Trakt as an intermediary. This is exactly the gap `WHY.md` describes, and it appears to still be unclaimed.

9. **Rewatch needs to be modeled as discrete history entries from day one.** Showly's 5-year-old unresolved issue exists because a rewatch can't be disambiguated when it's not a first-class, separately-tracked event. Our `History` capability should model each watch/rewatch as its own entry from the start, not add this on top of a single boolean later.

10. **In-app roadmap visibility is a cheap trust signal.** The one tool praised for transparency shows its own "coming soon" section in-app. We already publish `ROADMAP.md` publicly; surfacing it inside the app itself (post-MVP) would reinforce the same "this is actively maintained" message already central to the landing page.

11. **"Where to watch" is a real but optional feature idea.** The newest app asks users which streaming services they use. Interesting, but it introduces a live external data dependency, so per `docs/ARCHITECTURE.md`'s network boundary principle it would need to stay strictly opt-in and non-blocking if pursued.

See `ROADMAP.md` for where these findings have already been folded in.
