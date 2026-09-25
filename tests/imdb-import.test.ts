import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { createEmptyArchive, createItem } from '../src/domain/archive.js';
import { applyImdbImport, previewImdbImport } from '../src/import/imdb.js';

const headers =
  'Position,Const,Created,Modified,Description,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors,Your Rating,Date Rated';
const row = (values: string) => `${headers}\n${values}\n`;

describe('IMDb CSV import', () => {
  it('parses the synthetic IMDb fixture without changing the archive', () => {
    const source = readFileSync(
      resolve('tests/fixtures/import/imdb-watchlist.synthetic.csv'),
      'utf8',
    );
    const archive = createEmptyArchive();
    const preview = previewImdbImport(
      { name: 'imdb-export.csv', text: source },
      archive,
    );

    expect(archive.items).toEqual([]);
    expect(preview.items).toHaveLength(3);
    expect(preview.items[0]).toMatchObject({
      externalIds: { imdb: 'tt0000000001' },
      type: 'film',
      category: 'Film',
      status: 'completed',
      progress: { current: 100, target: 100, unit: 'percent' },
      tags: expect.arrayContaining([
        'IMDb watchlist',
        'Adventure',
        'Science Fiction',
      ]),
      description:
        'Synthetic fixture record, with a comma\n\nIMDb: https://example.test/title/tt0000000001/',
    });
    expect(preview.items[1]).toMatchObject({
      externalIds: { imdb: 'tt0000000002' },
      type: 'series',
      category: 'Series',
    });
    expect(preview.warnings.join(' ')).toContain('watchlist');
  });

  it('maps ratings and rated dates while retaining source metadata', () => {
    const preview = previewImdbImport(
      {
        name: 'ratings.csv',
        text: row(
          '1,tt0000000101,2024-01-01,2024-01-02,,Example Film,Original,https://example.test/title/tt0000000101/,Film,9.3,142,1994,"Drama, Crime",3000,1994-10-14,Director,8,2024-01-02',
        ),
      },
      createEmptyArchive(),
    );

    expect(preview.items[0]).toMatchObject({
      status: 'completed',
      progress: { current: 100, target: 100, unit: 'percent' },
      rating: 4.65,
      tags: ['IMDb watchlist', 'Drama', 'Crime'],
      description: 'IMDb: https://example.test/title/tt0000000101/',
      externalIds: { imdb: 'tt0000000101' },
      attributes: {
        imdbListMembership: 'watchlist',
        imdbPosition: 1,
        imdbCreatedAt: '2024-01-01T00:00:00.000Z',
        imdbModifiedAt: '2024-01-02T00:00:00.000Z',
        imdbDateRated: '2024-01-02T00:00:00.000Z',
        imdbUrl: 'https://example.test/title/tt0000000101/',
        imdbRating: 9.3,
        imdbYourRating: 8,
        imdbRuntimeMinutes: 142,
        imdbYear: 1994,
        imdbGenres: 'Drama, Crime',
        imdbVoteCount: 3000,
        imdbReleaseDate: '1994-10-14',
        creator: 'Director',
        imdbDirectors: 'Director',
      },
    });
  });

  it('requires a duplicate decision and preserves local fields on update', () => {
    const archive = createEmptyArchive();
    archive.items.push(
      createItem({
        id: 'existing',
        type: 'movie',
        category: 'Movies',
        title: 'Example Film',
        progress: { current: 10, target: 100, unit: 'percent' },
        notes: ['keep this'],
        collections: ['Favourites'],
        attributes: { localOnly: true },
      }),
    );
    const preview = previewImdbImport(
      {
        name: 'watchlist.csv',
        text: row(
          '1,tt0000000101,2024-01-01,2024-01-01,,Example Film,Original,https://example.test/title/tt0000000101/,Film,9.3,142,1994,Drama,3000,1994-10-14,Director,,',
        ),
      },
      archive,
    );

    expect(preview.conflicts).toEqual([
      expect.objectContaining({ existingItemId: 'existing' }),
    ]);
    expect(applyImdbImport(archive, preview, 'skip').items).toHaveLength(1);
    expect(applyImdbImport(archive, preview, 'update').items[0]).toMatchObject({
      type: 'film',
      category: 'Film',
      notes: ['keep this'],
      collections: ['Favourites'],
      attributes: { localOnly: true, imdbListMembership: 'watchlist' },
      externalIds: { imdb: 'tt0000000101' },
    });
  });

  it('rejects malformed and unsupported files before creating an import plan', () => {
    const archive = createEmptyArchive();
    expect(() =>
      previewImdbImport({ name: 'export.zip', text: '' }, archive),
    ).toThrow('IMDb CSV export');
    expect(() =>
      previewImdbImport(
        { name: 'broken.csv', text: 'Title,Const\nExample,tt1,extra\n' },
        archive,
      ),
    ).toThrow('missing the Title Type');
    expect(() =>
      previewImdbImport(
        { name: 'broken.csv', text: `${headers}\n1,not-an-id\n` },
        archive,
      ),
    ).toThrow('invalid column count');
  });
});
