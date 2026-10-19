# Local catalogs

Local catalogs are optional, versioned metadata datasets that help users
discover items without requiring a provider request. They are not the user-owned
archive and never contain personal status, progress, ratings, notes, or history.

## Current seed

[`data/catalog/film.json`](../data/catalog/film.json) is the first catalog. It
contains ten illustrative film records for development and offline smoke tests.
The records are intentionally sample data, not a complete film database and not
claims about external films.

Each catalog has:

- `schemaVersion`: compatibility version for the catalog format;
- `category`: category namespace, currently `film`;
- `generatedAt`: generation timestamp;
- `records`: stable catalog IDs, display metadata, optional attributes, and
  provenance.

Catalog records must retain their source and license metadata. External data
must not be added without verifying its redistribution terms and documenting
the source.

## Protected seed rule

The repository seed catalogs are protected fixtures. AI agents and automated
maintenance must not delete, truncate, reorder destructively, or silently
replace catalog records. Intentional changes require an issue or explicit
maintainer request, an explanation of the reason, updated validation fixtures,
and a review of the relevant license and provenance metadata.

Catalog changes must never remove or mutate user-owned archive data.
