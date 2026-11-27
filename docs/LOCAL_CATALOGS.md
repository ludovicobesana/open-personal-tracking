# Local catalogs

Local catalogs are optional, versioned metadata datasets that help users
discover items without requiring a provider request. They are not the user-owned
archive and never contain personal status, progress, ratings, notes, or history.

## Current seed

[`data/catalog/film.json`](../data/catalog/film.json) contains the curated
offline film and series records currently shown in Discover. The app validates
and searches these records in-browser before any optional provider search, so
catalog search works without a network request. Adding a result is explicit:
only the chosen record becomes part of the user-owned archive.

The expanded series catalog is independently stored in `series.json`.
The original series record remains in the film seed for compatibility.
Books and video games now also contain curated records.

The other category namespaces are intentionally separate local files:
`video-games.json`, `podcasts.json`, `youtube-videos.json`, `music.json`,
`anime.json`, and `books.json`. They remain visible in Discover even when empty.

Each catalog has:

- `schemaVersion`: compatibility version for the catalog format;
- `category`: category namespace, currently `film`;
- `generatedAt`: generation timestamp;
- `records`: stable catalog IDs, display metadata, optional attributes, and
  provenance.

Catalog records must retain their source and license metadata. External data
must not be added without verifying its redistribution terms and documenting
the source.

The current film records use Wikidata-compatible factual metadata and original
short descriptions. IMDb, community, and merchandise URLs are outbound
references only: the project does not copy IMDb content or sell merchandise.

## Local cover assets

Optional local cover paths are served from `web/public/images/film-covers/` and
are stored in the catalog record's `localCoverPath` attribute. They are copied
to a user's local archive only as a relative display reference, not as an
external provider URL, so local catalog use remains offline.

`hackers-1995-cover.webp` was supplied directly by the project maintainer on
2026-10-26 and converted from the supplied 389×576 JPEG to WebP without
cropping or editorial changes. It is 39 KB. No independent redistribution
licence evidence was supplied with the image; confirm permission to distribute
it before publishing a release that includes this asset, or replace it with a
properly licensed cover.

## Protected seed rule

The repository seed catalogs are protected fixtures. AI agents and automated
maintenance must not delete, truncate, reorder destructively, or silently
replace catalog records. Intentional changes require an issue or explicit
maintainer request, an explanation of the reason, updated validation fixtures,
and a review of the relevant license and provenance metadata. Intentional
replacements also require a migration or deprecation note explaining the
old and new IDs and how existing archive items remain usable.

Catalog changes must never remove or mutate user-owned archive data.

## November 2026 curated expansion

The new entries are manually curated factual identifiers (title and year or
author). Their original compilation is covered by the repository license;
no third-party descriptions, ratings, artwork or availability data are copied.
Each entry carries source, license and timestamp metadata. The existing seed
records remain unchanged and in their original order.

To refresh, review factual identifiers and licensing, preserve existing IDs,
update the generation timestamp, run the catalog tests and review the web
build before publishing. No external provider or secret is required.
This catalog does not represent Netflix or other streaming availability.

## Offline search

Search matches case- and accent-insensitive text. Exact titles rank before
title prefixes, title substrings and metadata matches; ties retain catalog
and seed order. An empty query retains seed order. Discover renders six
records per page; the core page API rejects page sizes outside 1–50.
Missing or invalid optional datasets are isolated from valid catalogs and
manual archive entry. Old datasets remain searchable; there is no automatic
network refresh. Search never reads or writes personal history.

## Horror and 2026 expansion

The November 27 expansion appends 151 manually curated horror titles and 136 titles from the public 2026 release calendar at
https://www.firstshowing.net/schedule2026/. Only factual title/year references
are included, not descriptions, ratings or posters. IMDb links lead to title
search results, not verified individual IMDb title IDs. Calendar entries use
2026 as the release-calendar year, which can differ from a festival premiere
or original production year. A passed calendar date is not confirmation of
an actual release; December entries are explicitly marked scheduled. This is
an initial non-exhaustive selection, not a complete global film census.
