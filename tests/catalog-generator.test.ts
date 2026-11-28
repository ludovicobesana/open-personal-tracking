import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const timestamp = '2026-01-01T00:00:00.000Z';
const seed = {
  schemaVersion: 1,
  category: 'books',
  generatedAt: timestamp,
  records: [
    {
      id: 'seed-book',
      title: 'Seed book',
      category: 'Book',
      genres: [],
      attributes: {},
      provenance: {
        source: 'Synthetic seed',
        license: 'CC0',
        importedAt: timestamp,
      },
    },
  ],
};
const source = {
  format: 'curated-rows-v1',
  path: 'rows.json',
  source: 'Synthetic curated rows',
  license: 'CC0',
  importedAt: timestamp,
};

describe('local catalog generator', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'opt-catalog-'));
    writeFileSync(join(directory, 'seed.json'), JSON.stringify(seed));
    writeFileSync(
      join(directory, 'manifest.json'),
      JSON.stringify({
        catalogs: [
          {
            category: 'books',
            seed: 'seed.json',
            generatedAt: timestamp,
            sources: [source],
          },
        ],
      }),
    );
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  function writeRows(rows: unknown) {
    writeFileSync(join(directory, 'rows.json'), JSON.stringify(rows));
  }

  function generate(output: string) {
    return spawnSync(
      process.execPath,
      [
        resolve('scripts/generate-catalogs.mjs'),
        join(directory, 'manifest.json'),
        join(directory, output),
      ],
      { encoding: 'utf8' },
    );
  }

  it('generates identical bytes and keeps seed records unchanged', () => {
    writeRows([
      {
        id: 'new-book',
        title: '  New book  ',
        category: 'Book',
        aliases: ['Alternative'],
      },
    ]);
    const first = generate('first');
    const second = generate('second');
    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    const bytes = readFileSync(join(directory, 'first', 'books.json'), 'utf8');
    expect(bytes).toBe(
      readFileSync(join(directory, 'second', 'books.json'), 'utf8'),
    );
    const catalog = JSON.parse(bytes);
    expect(catalog.records[0]).toEqual(seed.records[0]);
    expect(catalog.records[1]).toMatchObject({
      id: 'new-book',
      title: 'New book',
      attributes: { aliases: 'Alternative' },
      provenance: {
        source: source.source,
        license: source.license,
        importedAt: timestamp,
      },
    });
  });

  it('rejects malformed and duplicate source rows with diagnostics', () => {
    writeRows([{ id: 'new-book', category: 'Book' }]);
    const invalid = generate('output');
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain('0.title');
    writeRows([{ id: 'seed-book', title: 'Duplicate', category: 'Book' }]);
    const duplicate = generate('output');
    expect(duplicate.status).toBe(1);
    expect(duplicate.stderr).toContain('row 1: duplicate ID seed-book');
  });

  it('refuses to remove a record from a previous output', () => {
    writeRows([{ id: 'new-book', title: 'New', category: 'Book' }]);
    const first = generate('output');
    expect(first.status, first.stderr).toBe(0);
    const path = join(directory, 'output', 'books.json');
    const before = readFileSync(path, 'utf8');
    writeRows([]);
    const result = generate('output');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('protected seed changed: new-book');
    expect(readFileSync(path, 'utf8')).toBe(before);
  });
});
