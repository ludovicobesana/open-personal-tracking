import { describe, expect, it } from 'vitest';

import { createEmptyArchive, createItem } from '../src/domain/archive.js';
import { applyImdbImport, previewImdbImport } from '../src/import/imdb.js';
import {
  filterItems,
  getHistoryTimeline,
  searchItems,
  sortItems,
} from '../src/domain/search.js';

const timestamp = '2026-01-01T00:00:00.000Z';
const measure = (operation: () => void): number => {
  const startedAt = performance.now();
  operation();
  return performance.now() - startedAt;
};

const createSyntheticArchive = (itemCount: number, historyCount: number) => {
  const archive = createEmptyArchive();

  archive.items = Array.from({ length: itemCount }, (_, index) =>
    createItem({
      id: `performance-item-${index}`,
      title: `Synthetic title ${index}`,
      category: index % 2 === 0 ? 'Film' : 'Book',
      type: index % 2 === 0 ? 'film' : 'book',
      status: index % 3 === 0 ? 'completed' : 'in_progress',
      progress: { current: index % 100, target: 100, unit: 'percent' },
      description: `Synthetic description for item ${index}.`,
      notes: [`Private note ${index}`],
      tags: index % 2 === 0 ? ['synthetic', 'watched'] : ['synthetic'],
      collections: index % 5 === 0 ? ['favourites'] : [],
      attributes: { source: 'performance-fixture', position: index },
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  );
  archive.history = Array.from({ length: historyCount }, (_, index) => ({
    id: `performance-history-${index}`,
    itemId: `performance-item-${index % itemCount}`,
    action: index % 2 === 0 ? ('updated' as const) : ('watched' as const),
    timestamp,
    summary: `Synthetic history event ${index}`,
  }));

  return archive;
};

const createSyntheticImdbExport = (itemCount: number): string => {
  const headers =
    'Position,Const,Created,Modified,Description,Title,Original Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors,Your Rating,Date Rated';
  const rows = Array.from({ length: itemCount }, (_, index) =>
    [
      index + 1,
      `tt${String(index).padStart(10, '0')}`,
      '2026-01-01',
      '2026-01-01',
      '',
      `Imported performance film ${index}`,
      `Imported performance film ${index}`,
      `https://example.test/title/tt${String(index).padStart(10, '0')}/`,
      'Film',
      '',
      '',
      '2026',
      'Drama',
      '',
      '',
      '',
      '',
      '',
    ].join(','),
  );

  return `${headers}\n${rows.join('\n')}\n`;
};

describe('local archive performance budgets', () => {
  it('keeps typical archive search, filtering, sorting, and history bounded', () => {
    const archive = createSyntheticArchive(1_000, 5_000);
    const searchDuration = measure(() => {
      expect(searchItems(archive.items, 'synthetic title 99')).not.toHaveLength(
        0,
      );
    });
    const filterDuration = measure(() => {
      expect(
        filterItems(archive.items, {
          category: ['Film'],
          status: ['completed'],
          tag: ['watched'],
          query: 'synthetic',
        }),
      ).not.toHaveLength(0);
    });
    const sortDuration = measure(() => {
      expect(sortItems(archive.items, 'title')).toHaveLength(
        archive.items.length,
      );
    });
    const historyDuration = measure(() => {
      expect(getHistoryTimeline(archive.history)).toHaveLength(
        archive.history.length,
      );
    });

    expect(searchDuration).toBeLessThan(250);
    expect(filterDuration).toBeLessThan(500);
    expect(sortDuration).toBeLessThan(500);
    expect(historyDuration).toBeLessThan(500);
  });

  it('keeps large archive operations within the documented upper budgets', () => {
    const archive = createSyntheticArchive(5_000, 25_000);
    const searchDuration = measure(() => searchItems(archive.items, 'note 42'));
    const filterDuration = measure(() =>
      filterItems(archive.items, {
        category: ['Film'],
        status: ['in_progress'],
        query: 'synthetic',
      }),
    );
    const historyDuration = measure(() => getHistoryTimeline(archive.history));

    expect(searchDuration).toBeLessThan(1_500);
    expect(filterDuration).toBeLessThan(2_500);
    expect(historyDuration).toBeLessThan(2_500);
  });

  it('keeps import preview and application within the import budget', () => {
    const source = createSyntheticImdbExport(500);
    const initialArchive = createSyntheticArchive(1_000, 5_000);
    let preview = previewImdbImport(
      { name: 'synthetic-performance-export.csv', text: source },
      initialArchive,
    );
    const previewDuration = measure(() => {
      preview = previewImdbImport(
        { name: 'synthetic-performance-export.csv', text: source },
        initialArchive,
      );
    });
    const applyDuration = measure(() => {
      const applied = applyImdbImport(initialArchive, preview, 'skip');
      expect(applied.items.length).toBeGreaterThan(initialArchive.items.length);
    });

    expect(preview.items).toHaveLength(500);
    expect(previewDuration).toBeLessThan(2_000);
    expect(applyDuration).toBeLessThan(2_000);
  });
});
