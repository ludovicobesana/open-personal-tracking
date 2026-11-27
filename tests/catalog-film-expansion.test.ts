import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCatalog } from '../src/catalog/catalog-schema.js';

const catalog = parseCatalog(
  JSON.parse(
    readFileSync(resolve(process.cwd(), 'data/catalog/film.json'), 'utf8'),
  ),
);

describe('horror and 2026 expansion', () => {
  it('contains at least 100 additional horror films', () => {
    const horror = catalog.records.filter(
      (record) =>
        record.provenance.importedAt === '2026-11-27T00:00:00.000Z' &&
        record.genres.includes('Horror'),
    );
    expect(horror.length).toBeGreaterThanOrEqual(100);
    expect(horror.every((record) => Boolean(record.attributes.imdbUrl))).toBe(
      true,
    );
  });

  it('distinguishes calendar entries from scheduled releases', () => {
    const entries = catalog.records.filter((record) => record.year === 2026);
    expect(entries.length).toBeGreaterThanOrEqual(100);
    expect(
      entries.some((record) => record.attributes.releaseStatus === 'scheduled'),
    ).toBe(true);
    expect(entries.every((record) => Boolean(record.attributes.imdbUrl))).toBe(
      true,
    );
  });
});
