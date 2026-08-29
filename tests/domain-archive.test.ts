import { describe, expect, it } from 'vitest';

import {
  CURRENT_SCHEMA_VERSION,
  createEmptyArchive,
  createItem,
  migrateArchiveSnapshot,
  parseArchiveSnapshot,
  serializeArchiveSnapshot,
} from '../src/domain/archive';

describe('domain archive schema', () => {
  it('creates an empty archive snapshot with the current version', () => {
    const archive = createEmptyArchive();

    expect(archive.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(archive.items).toEqual([]);
    expect(archive.collections).toEqual([]);
    expect(archive.history).toEqual([]);
  });

  it('creates a valid generic item', () => {
    const item = createItem({
      title: 'Dune',
      category: 'book',
      status: 'in_progress',
      progress: {
        current: 184,
        target: 688,
        unit: 'pages',
      },
      rating: 5,
      notes: ['Strong worldbuilding'],
      tags: ['classic', 'sci-fi'],
      collections: ['favourites'],
      attributes: {
        author: 'Frank Herbert',
      },
    });

    expect(item.title).toBe('Dune');
    expect(item.status).toBe('in_progress');
    expect(item.progress.current).toBe(184);
    expect(item.attributes.author).toBe('Frank Herbert');
  });

  it('parses a valid archive snapshot', () => {
    const archive = parseArchiveSnapshot({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      items: [],
      collections: [],
      history: [],
    });

    expect(archive.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('migrates a legacy archive snapshot without losing data', () => {
    const legacy = {
      schemaVersion: 0,
      exportedAt: '2024-01-01T00:00:00.000Z',
      items: [
        {
          id: 'item-1',
          title: 'Dune',
          category: 'book',
          status: 'completed',
          progress: { current: 688, target: 688, unit: 'pages' },
          rating: 5,
          notes: ['finished'],
          tags: ['classic'],
          collections: ['favorites'],
          attributes: { author: 'Frank Herbert' },
          externalIds: { openlibrary: 'OL1234' },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      collections: [
        { id: 'col-1', name: 'Favorites', itemIds: ['item-1'] },
      ],
      history: [
        { id: 'hist-1', itemId: 'item-1', action: 'completed', timestamp: '2024-01-01T00:00:00.000Z', summary: 'Finished Dune' },
      ],
    };

    const migrated = migrateArchiveSnapshot(legacy);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.items[0].title).toBe('Dune');
    expect(migrated.items[0].attributes.author).toBe('Frank Herbert');
    expect(migrated.collections[0].name).toBe('Favorites');
  });

  it('rejects malformed archive snapshots', () => {
    expect(() =>
      parseArchiveSnapshot({
        schemaVersion: 1,
        exportedAt: 'not-a-date',
        items: [],
        collections: [],
        history: [],
      })
    ).toThrow();
  });

  it('serializes to a valid JSON string', () => {
    const archive = createEmptyArchive();
    const json = serializeArchiveSnapshot(archive);

    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
