# IMDb CSV import

The IMDb importer runs entirely in the browser. It reads only the CSV selected
by the person and never uses IMDb credentials, an API, scraping, or a network
request.

## Supported export

The supported format is the comma-separated IMDb list export represented by
the sample used for this implementation. It must contain these columns:

- `Const`
- `Title`
- `Title Type`

The following columns are read when available: `Position`, `Created`,
`Modified`, `Description`, `Original Title`, `URL`, `IMDb Rating`, `Runtime
(mins)`, `Year`, `Genres`, `Num Votes`, `Release Date`, `Directors`, `Your
Rating`, and `Date Rated`.

Only direct CSV exports are supported in this release. ZIP archives and other
IMDb download formats are rejected rather than being guessed.

## Mapping and limitations

- Every imported row is marked with the `IMDb watchlist` tag and the
  `imdbListMembership: watchlist` source attribute. Each comma-separated
  value in `Genres` is also added as an item tag for every imported title.
- `Const` is preserved as the item `imdb` external ID. Titles marked as TV
  series are imported as series; other title types are imported as `Film`
  items. Updating a duplicate that an earlier version imported as
  `movie`/`Movies` moves it to the `Film` category.
- When present, the source `URL` is appended to the imported item description
  as an IMDb link, after any source description.
- `IMDb Rating` is converted from IMDb's 0–10 range to the archive's 0–5
  rating and shown on the imported item. `Your Rating` is retained as source
  metadata. Every IMDb row is marked completed with 100% progress. `Date
Rated` is retained as source metadata, but does not alter that status.
- IMDb's source position, created and modified dates, URL, public rating,
  runtime, year, genres, vote count, release date, directors, and rated date
  are retained as source attributes. `Directors` is also mapped to the
  application's author field. Public catalog fields are not promoted to a
  personal rating or inferred progress.
- Short-form, video, TV special, and episode rows are retained as `Film` items;
  the export does not contain enough structure to rebuild a series hierarchy.

## Safety and conflicts

The importer parses the complete CSV and validates the full resulting archive
before browser storage is changed. A preview reports all known limitations and
matches duplicates by IMDb ID first, then title plus item type. Before applying
the import, the person explicitly chooses to skip matches or update their
IMDb-derived status, rating, and metadata. Updates retain local notes,
collections, tags, and attributes.

Malformed, unsupported, and cancelled imports leave the current archive
unchanged.
