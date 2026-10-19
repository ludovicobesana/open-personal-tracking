import { describe, expect, it } from 'vitest';
import type { HistoryEntry, Item } from '../src/domain/archive.js';
import { calculateArchiveInsights } from '../src/domain/insights.js';

const item = (overrides: Partial<Item> = {}): Item => ({
  id: 'item-1',
  type: 'book',
  title: 'Example',
  category: 'Book',
  status: 'completed',
  progress: { current: 1, target: 1, unit: 'book' },
  notes: [],
  tags: [],
  collections: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  attributes: {},
  externalIds: {},
  subunits: [],
  ...overrides,
});

const historyEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: 'history-1',
  itemId: 'item-1',
  action: 'completed',
  timestamp: '2026-03-12T00:00:00.000Z',
  summary: 'Completed Example',
  ...overrides,
});

describe('calculateArchiveInsights', () => {
  it('aggregates trends, ratings, and categories from local data', () => {
    const insights = calculateArchiveInsights(
      [
        item({ id: 'book-1', rating: 4.4, category: 'Book' }),
        item({
          id: 'film-1',
          rating: 4.6,
          category: 'Film',
          status: 'in_progress',
        }),
      ],
      [
        historyEntry({ timestamp: '2026-02-01T00:00:00.000Z' }),
        historyEntry({
          id: 'history-2',
          action: 'watched',
          timestamp: '2026-03-12T00:00:00.000Z',
        }),
      ],
      new Date('2026-03-20T00:00:00.000Z'),
    );

    expect(insights.trend.map((point) => point.completions)).toEqual([
      0, 0, 0, 0, 1, 1,
    ]);
    expect(insights.ratings).toEqual([
      { rating: 0, count: 0 },
      { rating: 1, count: 0 },
      { rating: 2, count: 0 },
      { rating: 3, count: 0 },
      { rating: 4, count: 1 },
      { rating: 5, count: 1 },
    ]);
    expect(insights.categories).toEqual([
      { category: 'Book', total: 1, completed: 1 },
      { category: 'Film', total: 1, completed: 0 },
    ]);
  });

  it('reports malformed history and limits very large history inputs', () => {
    const history = Array.from({ length: 10_001 }, (_, index) =>
      historyEntry({
        id: `history-${index}`,
        timestamp: index === 10_000 ? 'not-a-date' : '2026-03-12T00:00:00.000Z',
      }),
    );

    const insights = calculateArchiveInsights(
      [item({ rating: undefined })],
      history,
      new Date('2026-03-20T00:00:00.000Z'),
    );

    expect(insights.historyWasLimited).toBe(true);
    expect(insights.includedHistoryCount).toBe(9_999);
    expect(insights.ignoredHistoryCount).toBe(1);
  });

  it('returns explicit empty-state aggregates', () => {
    const insights = calculateArchiveInsights(
      [],
      [],
      new Date('2026-03-20T00:00:00.000Z'),
    );

    expect(insights.trend.every((point) => point.completions === 0)).toBe(true);
    expect(insights.ratings.every((bucket) => bucket.count === 0)).toBe(true);
    expect(insights.categories).toEqual([]);
    expect(insights.includedItemCount).toBe(0);
  });
});
