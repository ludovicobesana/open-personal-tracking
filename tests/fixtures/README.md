# Test fixture policy

Fixtures in this directory are deliberately synthetic and minimized. They must
not contain a person's export, account data, viewing history, private notes,
credentials, or identifiers copied from a production service.

## IMDb watchlist fixture

`import/imdb-watchlist.synthetic.csv` is an invented three-row CSV used by
`tests/imdb-import.test.ts`. Every title, identifier, URL, date, rating,
creator, and metadata value was created for this repository. The `tt` values
only satisfy the importer format check; they are not copied from an IMDb export
or intended to identify real titles.

The fixture covers quoted fields, film and series type mapping, source
attributes, ratings, and genre tags. Add a new synthetic row only when a test
needs a format case that the existing rows cannot express.

Before adding or changing any import fixture, document its provenance in this
file and keep only fields required by the test. See `SECURITY.md` for the
response process if potentially personal repository data is discovered.
