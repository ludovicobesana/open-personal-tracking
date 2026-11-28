import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Wikidata snapshot import', () => {
  it('preserves the seed and deduplicates repeated entities', () => {
    const directory = mkdtempSync(join(tmpdir(), 'catalog-wikidata-'));
    try {
      const input = join(directory, 'input.json');
      const row = {
        item: { value: 'http://www.wikidata.org/entity/Q999999999' },
        title: { value: 'Synthetic example book for import test' },
        creator: { value: 'Synthetic author' },
        year: { value: '2020' },
      };
      writeFileSync(
        input,
        JSON.stringify({ results: { bindings: [row, row] } }),
      );
      const result = spawnSync(
        process.execPath,
        [
          'scripts/import-wikidata.mjs',
          'books',
          input,
          directory,
          '2026-11-27T00:00:00.000Z',
        ],
        { encoding: 'utf8' },
      );
      expect(result.status, result.stderr).toBe(0);
      const seed = JSON.parse(readFileSync('data/catalog/books.json', 'utf8'));
      const next = JSON.parse(
        readFileSync(join(directory, 'books.json'), 'utf8'),
      );
      expect(next.records.slice(0, seed.records.length)).toEqual(seed.records);
      expect(next.records).toHaveLength(seed.records.length + 1);
      expect(next.records.at(-1)).toMatchObject({
        id: 'wikidata-books-q999999999',
        provenance: { license: 'CC0-1.0' },
        attributes: { author: 'Synthetic author' },
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
