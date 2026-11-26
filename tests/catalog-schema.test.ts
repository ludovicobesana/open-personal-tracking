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
    expect(catalog.records.length).toBeGreaterThanOrEqual(100);
    expect(new Set(catalog.records.map((record) => record.id)).size).toBe(
      catalog.records.length,
    );
    expect(
      catalog.records.slice(0, 21).every(
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
        localCoverPath: '/images/film-covers/hackers-1995-cover.webp',
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

describe('expanded catalog namespaces', () => {
  it('ships at least 100 records in each requested media category', () => {
    const ids = new Set<string>();
    for (const [namespace, category] of [
      ['film', 'Film'],
      ['series', 'Series'],
      ['books', 'Book'],
      ['video-games', 'Video Game'],
    ]) {
      const catalog = parseCatalog(
        JSON.parse(
          readFileSync(
            resolve(process.cwd(), `data/catalog/${namespace}.json`),
            'utf8',
          ),
        ),
      );
      expect(catalog.category).toBe(namespace);
      expect(
        catalog.records.filter((record) => record.category === category).length,
      ).toBeGreaterThanOrEqual(100);
      for (const record of catalog.records) {
        expect(ids.has(record.id)).toBe(false);
        ids.add(record.id);
      }
    }
  });
});
