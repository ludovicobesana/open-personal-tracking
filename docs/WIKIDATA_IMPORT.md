## Wikidata import (film, series, books)

Wikidata structured data is CC0: https://www.wikidata.org/wiki/Wikidata:Licensing.
Run the category-specific query in `data/catalog-sources/wikidata/` at
https://query.wikidata.org/ and export SPARQL JSON. Then run:

```sh
npm run catalog:wikidata -- film /tmp/film.json /tmp/catalog-review 2026-11-27T00:00:00.000Z
```

Use `series` or `books` for the other datasets. The output directory must not
contain the corresponding file. Review counts, titles, dates and duplicate
candidates before copying the generated catalog into the repository. Existing
records remain unchanged. Identical snapshots and timestamps produce the same
output. Exact normalized title matches are conservatively skipped even when
this suppresses distinct works with identical names. Years before 1888 are
omitted to respect the existing schema; older books remain eligible. Queries
are bounded samples, not a complete census; adjust date windows and limits
manually as needed. No automatic download, app runtime requests or artwork.
The imported source snapshot is not included in this change.
