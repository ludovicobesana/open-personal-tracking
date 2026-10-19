import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  InvalidCatalogError,
  parseCatalog,
} from '../src/catalog/catalog-schema.js';

const filmCatalog = JSON.parse(
  readFileSync(resolve(process.cwd(), 'data/catalog/film.json'), 'utf8'),
);

describe('local film catalog', () => {
  it('contains ten validated illustrative seed records', () => {
    const catalog = parseCatalog(filmCatalog);

    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.category).toBe('film');
    expect(catalog.records).toHaveLength(10);
    expect(new Set(catalog.records.map((record) => record.id)).size).toBe(10);
    expect(
      catalog.records.every(
        (record) =>
          record.category === 'Film' &&
          record.provenance.source.includes('illustrative seed'),
      ),
    ).toBe(true);
  });

  it('rejects duplicate records with an actionable error', () => {
    const duplicateCatalog = {
      ...filmCatalog,
      records: [filmCatalog.records[0], filmCatalog.records[0]],
    };

    expect(() => parseCatalog(duplicateCatalog)).toThrow(
      new InvalidCatalogError(
        'records: duplicate catalog record id "sample-film-001"',
      ),
    );
  });

  it('rejects unsupported catalog versions', () => {
    expect(() => parseCatalog({ ...filmCatalog, schemaVersion: 2 })).toThrow(
      /schemaVersion/,
    );
  });
});
