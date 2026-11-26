import { describe, expect, it } from 'vitest';
import type { Catalog } from '../src/catalog/catalog-schema.js';
import {
  loadLocalCatalogs,
  searchLocalCatalogPage,
  searchLocalCatalogs,
} from '../src/catalog/local-catalog.js';

const provenance = {
  source: 'Synthetic fixture',
  license: 'CC0',
  importedAt: '2026-01-01T00:00:00.000Z',
};
const catalog: Catalog = {
  schemaVersion: 1,
  category: 'film',
  generatedAt: provenance.importedAt,
  records: [
    { id: '1', title: 'Other', attributes: { director: 'Dune' } },
    { id: '2', title: 'Return to Dune', attributes: {} },
    { id: '3', title: 'Dune Part Two', attributes: {} },
    { id: '4', title: 'Duné', attributes: {} },
  ].map((record) => ({
    ...record,
    attributes: { ...record.attributes } as Record<string, string>,
    category: 'Film',
    genres: [],
    provenance,
  })),
};

describe('offline catalog search', () => {
  it('ranks exact, prefix, substring and metadata matches', () => {
    expect(searchLocalCatalogs([catalog], ' DUNE ').map((r) => r.id)).toEqual([
      '4',
      '3',
      '2',
      '1',
    ]);
  });

  it('pages across ranking groups without duplicates or missing records', () => {
    const first = searchLocalCatalogPage([catalog], 'dune', 1, 3);
    const second = searchLocalCatalogPage([catalog], 'dune', 2, 3);
    expect(first.records.map((record) => record.id)).toEqual(['4', '3', '2']);
    expect(second.records.map((record) => record.id)).toEqual(['1']);
    expect(first.total).toBe(4);
    expect(first.pageCount).toBe(2);
    expect(searchLocalCatalogPage([catalog], 'dune', 99, 3)).toEqual(second);
  });

  it('retains seed order for an empty query', () => {
    expect(searchLocalCatalogPage([catalog], '').records).toEqual(
      searchLocalCatalogs([catalog], ''),
    );
  });

  it('handles absent or malformed catalogs independently', () => {
    const loaded = loadLocalCatalogs({
      film: catalog,
      books: undefined,
      games: { schemaVersion: 99 },
      music: catalog,
    });
    expect(loaded.catalogs).toEqual([catalog]);
    expect(loaded.errors).toHaveLength(3);
    expect(searchLocalCatalogPage([], 'dune')).toEqual({
      records: [],
      total: 0,
      page: 1,
      pageCount: 1,
    });
  });

  it('rejects invalid pagination and detaches returned metadata', () => {
    expect(() => searchLocalCatalogPage([catalog], '', 1, 51)).toThrow(
      RangeError,
    );
    expect(() => searchLocalCatalogPage([catalog], '', 0)).toThrow(RangeError);
    const result = searchLocalCatalogPage([catalog], '').records[0];
    result.attributes.director = 'Changed';
    expect(catalog.records[0].attributes.director).toBe('Dune');
  });
});
