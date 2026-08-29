import { describe, expect, it } from 'vitest';

import { createItem } from '../src/domain/archive.js';
import {
  createHistoryEntry,
  filterItems,
  getHistoryTimeline,
  searchItems,
  sortItems,
} from '../src/domain/search.js';

describe('local search and history', () => {
  const books = [
    createItem({
      title: 'Dune',
      category: 'book',
      status: 'in_progress',
      progress: { current: 184, target: 688, unit: 'pages' },
      rating: 5,
      notes: ['Strong worldbuilding'],
      tags: ['classic', 'sci-fi'],
      collections: ['favorites'],
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-01T10:00:00.000Z',
      attributes: { author: 'Frank Herbert' },
    }),
    createItem({
      title: 'The Left Hand of Darkness',
      category: 'book',
      status: 'completed',
      progress: { current: 1, target: 1, unit: 'book' },
      rating: 4,
      notes: ['Very thoughtful'],
      tags: ['classic'],
      collections: ['read-later'],
      createdAt: '2024-01-02T10:00:00.000Z',
      updatedAt: '2024-01-02T10:00:00.000Z',
      attributes: { author: 'Ursula K. Le Guin' },
    }),
    createItem({
      title: 'Arrival',
      category: 'film',
      status: 'planned',
      progress: { current: 0, target: 1, unit: 'film' },
      rating: 3,
      notes: ['Need to watch'],
      tags: ['thoughtful'],
      collections: ['watchlist'],
      createdAt: '2024-01-03T10:00:00.000Z',
      updatedAt: '2024-01-03T10:00:00.000Z',
      attributes: { director: 'Denis Villeneuve' },
    }),
  ];

  it('searches across title, tags, and notes', () => {
    const result = searchItems(books, 'worldbuilding');

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Dune');
  });

  it('filters by status and collection', () => {
    const result = filterItems(books, {
      status: ['completed'],
      collection: ['favorites'],
    });

    expect(result).toHaveLength(0);

    const completedBooks = filterItems(books, {
      status: ['completed'],
      collection: ['read-later'],
    });

    expect(completedBooks).toHaveLength(1);
    expect(completedBooks[0].title).toBe('The Left Hand of Darkness');
  });

  it('sorts items by updatedAt descending', () => {
    const sorted = sortItems(books, 'updatedAt');

    expect(sorted[0].title).toBe('Arrival');
  });

  it('builds a history timeline from actions across items', () => {
    const timeline = getHistoryTimeline([
      createHistoryEntry({
        itemId: books[0].id,
        action: 'created',
        summary: 'Added Dune',
        timestamp: '2024-01-01T10:00:00.000Z',
      }),
      createHistoryEntry({
        itemId: books[1].id,
        action: 'completed',
        summary: 'Finished The Left Hand of Darkness',
        timestamp: '2024-01-02T10:00:00.000Z',
      }),
    ]);

    expect(timeline).toHaveLength(2);
    expect(timeline[0].action).toBe('completed');
    expect(timeline[1].action).toBe('created');
  });
});
