import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { createEmptyArchive, createItem } from '../src/domain/archive.js';
import { applyImdbImport, previewImdbImport } from '../src/import/imdb.js';

const headers =
  'Position,Const,Created,Modified,Description,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors,Your Rating,Date Rated';
const row = (values: string) => `${headers}\n${values}\n`;

describe('IMDb CSV import', () => {
  it('parses the supplied IMDb export without changing the archive', () => {
    const source = readFileSync(
      resolve('web/public/7e928dc0-f351-4409-a301-9d25e0d64af5.csv'),
      'utf8',
    );
    const archive = createEmptyArchive();
    const preview = previewImdbImport(
      { name: 'imdb-export.csv', text: source },
      archive,
    );

    expect(archive.items).toEqual([]);
    expect(preview.items.length).toBeGreaterThan(900);
    expect(preview.items[0]).toMatchObject({
      externalIds: { imdb: 'tt9376612' },
      type: 'film',
      category: 'Film',
      status: 'completed',
      progress: { current: 100, target: 100, unit: 'percent' },
      tags: expect.arrayContaining(['IMDb watchlist', 'Azione', 'Avventura']),
      description: 'IMDb: https://www.imdb.com/title/tt9376612/',
    });
    expect(preview.warnings.join(' ')).toContain('watchlist');
  });

  it('maps ratings and rated dates while retaining source metadata', () => {
    const preview = previewImdbImport(
      {
        name: 'ratings.csv',
        text: row(
          '1,tt0111161,2024-01-01,2024-01-02,,Example Film,Original,https://www.imdb.com/title/tt0111161/,Film,9.3,142,1994,"Drama, Crime",3000,1994-10-14,Director,8,2024-01-02',
        ),
      },
      createEmptyArchive(),
    );

    expect(preview.items[0]).toMatchObject({
      status: 'completed',
      progress: { current: 100, target: 100, unit: 'percent' },
      rating: 4.65,
      tags: ['IMDb watchlist', 'Drama', 'Crime'],
      description: 'IMDb: https://www.imdb.com/title/tt0111161/',
      externalIds: { imdb: 'tt0111161' },
      attributes: {
        imdbListMembership: 'watchlist',
        imdbPosition: 1,
        imdbCreatedAt: '2024-01-01T00:00:00.000Z',
        imdbModifiedAt: '2024-01-02T00:00:00.000Z',
        imdbDateRated: '2024-01-02T00:00:00.000Z',
        imdbUrl: 'https://www.imdb.com/title/tt0111161/',
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
          '1,tt0111161,2024-01-01,2024-01-01,,Example Film,Original,https://www.imdb.com/title/tt0111161/,Film,9.3,142,1994,Drama,3000,1994-10-14,Director,,',
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
      externalIds: { imdb: 'tt0111161' },
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
