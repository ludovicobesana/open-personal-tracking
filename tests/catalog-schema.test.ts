import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  InvalidCatalogError,
  parseCatalog,
} from '../src/catalog/catalog-schema.js';
import { searchLocalCatalogs } from '../src/catalog/local-catalog.js';
import { catalogRecordToItemInput } from '../src/catalog/catalog-item-input.js';

const filmCatalog = JSON.parse(
  readFileSync(resolve(process.cwd(), 'data/catalog/film.json'), 'utf8'),
);

describe('local film catalog', () => {
  it('contains the requested, provenance-labelled offline records', () => {
    const catalog = parseCatalog(filmCatalog);

    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.category).toBe('film');
    expect(catalog.records).toHaveLength(21);
    expect(new Set(catalog.records.map((record) => record.id)).size).toBe(21);
    expect(
      catalog.records.every(
        (record) =>
          ['Film', 'Series'].includes(record.category) &&
          record.provenance.source.includes('Wikidata') &&
          Boolean(record.attributes.imdbUrl) &&
          Boolean(record.attributes.fanCommunityUrl) &&
          Boolean(record.attributes.merchandiseUrl),
      ),
    ).toBe(true);
  });

  it('searches locally across IMDb-style metadata without a provider', () => {
    const results = searchLocalCatalogs(
      [parseCatalog(filmCatalog)],
      'Wachowski',
    );

    expect(results.map((record) => record.id)).toContain(
      'matrix-trilogy-1999-2003',
    );
  });

  it('creates a planned archive input only after an explicit catalog add', () => {
    const record = parseCatalog(filmCatalog).records[0];
    const input = catalogRecordToItemInput(record, true);

    expect(input).toMatchObject({
      title: 'Hackers',
      category: 'Film',
      status: 'planned',
      progress: { current: 0, target: 1, unit: 'item' },
      attributes: {
        localCatalogId: 'hackers-1995',
        creator: 'Iain Softley',
        usePlaceholderCover: true,
      },
    });
  });

  it('rejects duplicate records with an actionable error', () => {
    const duplicateCatalog = {
      ...filmCatalog,
      records: [filmCatalog.records[0], filmCatalog.records[0]],
    };

    expect(() => parseCatalog(duplicateCatalog)).toThrow(
      new InvalidCatalogError(
        'records: duplicate catalog record id "hackers-1995"',
      ),
    );
  });

  it('rejects unsupported catalog versions', () => {
    expect(() => parseCatalog({ ...filmCatalog, schemaVersion: 2 })).toThrow(
      /schemaVersion/,
    );
  });
});
