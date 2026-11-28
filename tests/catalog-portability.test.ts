import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCatalog } from '../src/catalog/catalog-schema.js';
import { catalogRecordToItemInput } from '../src/catalog/catalog-item-input.js';
import { searchLocalCatalogs } from '../src/catalog/local-catalog.js';
import { createEmptyArchive, createItem } from '../src/domain/archive.js';
import {
  createArchiveBackup,
  prepareArchiveRestore,
} from '../src/application/archive-backup.js';

const fixture = JSON.parse(
  readFileSync(
    resolve(process.cwd(), 'tests/fixtures/catalog/v1.synthetic.json'),
    'utf8',
  ),
);

describe('catalog contract portability', () => {
  it('round-trips identifiers, provenance and extension fields', () => {
    const parsed = parseCatalog(fixture);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(fixture);
    expect(parseCatalog(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it.each(['id', 'title', 'category', 'provenance'])(
    'identifies missing required field %s',
    (field) => {
      const invalid = structuredClone(fixture);
      delete invalid.records[0][field];
      expect(() => parseCatalog(invalid)).toThrow(
        new RegExp(`records\\.0\\.${field}`),
      );
    },
  );

  it.each([
    'not a URL',
    'javascript:alert(1)',
    'https://user:secret@example.invalid',
    'ftp://example.invalid/file',
  ])('rejects unsafe outbound URLs: %s', (url) => {
    const invalid = structuredClone(fixture);
    invalid.records[0].attributes.imdbUrl = url;
    expect(() => parseCatalog(invalid)).toThrow(
      /records\.0\.attributes\.imdbUrl: Expected an HTTP/,
    );
  });

  it('rejects unsupported versions and duplicate IDs', () => {
    expect(() => parseCatalog({ ...fixture, schemaVersion: 2 })).toThrow(
      /schemaVersion/,
    );
    expect(() =>
      parseCatalog({
        ...fixture,
        records: [fixture.records[0], fixture.records[0]],
      }),
    ).toThrow(/duplicate catalog record id/);
  });

  it('keeps discovery out of archive exports until explicit addition', () => {
    const archive = createEmptyArchive();
    const before = createArchiveBackup(archive);
    const catalog = parseCatalog(fixture);
    const [record] = searchLocalCatalogs([catalog], 'synthetic');
    const input = catalogRecordToItemInput(record, true);
    input.tags?.push('user tag');
    expect(catalog.records[0].genres).toEqual(['Fiction']);
    expect(record.genres).toEqual(['Fiction']);
    expect(createArchiveBackup(archive)).toBe(before);
    const item = createItem(input);
    const populated = { ...archive, items: [item] };
    const backup = createArchiveBackup(populated);
    expect(prepareArchiveRestore(backup).items).toEqual([item]);
    expect(prepareArchiveRestore(backup).items[0].attributes).toMatchObject({
      localCatalogId: 'synthetic-book',
      creator: 'Invented author',
      customAttribute: 'custom',
    });
    expect(archive.items).toHaveLength(0);
  });
});
