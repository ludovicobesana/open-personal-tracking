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

The other category namespaces are intentionally separate local files:
`video-games.json`, `podcasts.json`, `youtube-videos.json`, `music.json`,
`anime.json`, and `books.json`. They are visible in Discover even while
empty, rather than being hidden inside the film dataset.

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
and a review of the relevant license and provenance metadata.

Catalog changes must never remove or mutate user-owned archive data.
