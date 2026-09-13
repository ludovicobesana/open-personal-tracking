import { describe, expect, it } from 'vitest';

import { ArchiveApplication } from '../src/application/archive-application.js';
import {
  CURRENT_SCHEMA_VERSION,
  createEmptyArchive,
  createItem,
  parseArchiveSnapshot,
  type ArchiveSnapshot,
} from '../src/domain/archive.js';

class MemoryArchivePersistence {
  snapshot: ArchiveSnapshot | null = null;

  async load(): Promise<ArchiveSnapshot | null> {
    return this.snapshot;
  }

  async save(snapshot: ArchiveSnapshot): Promise<void> {
    this.snapshot = structuredClone(snapshot);
  }

  async clear(): Promise<void> {
    this.snapshot = null;
  }
}

const seriesInput = {
  id: 'the-expanse',
  title: 'The Expanse',
  category: 'Series',
  progress: { current: 99, target: 99, unit: 'episodes' },
  status: 'completed' as const,
  subunits: [
    {
      id: 'season-1',
      kind: 'season' as const,
      title: 'Season 1',
      description: 'The first season.',
      imageUrl: 'https://example.test/season-1.jpg',
      position: 1,
      completed: false,
      watchCount: 0,
    },
    {
      id: 's1e1',
      kind: 'episode' as const,
      title: 'Dulcinea',
      description: 'The first episode.',
      imageUrl: 'https://example.test/s1e1.jpg',
      parentId: 'season-1',
      position: 1,
      completed: false,
      watchCount: 0,
    },
    {
      id: 's1e2',
      kind: 'episode' as const,
      title: 'The Big Empty',
      parentId: 'season-1',
      position: 2,
      completed: false,
      watchCount: 0,
    },
  ],
};

describe('parent and sub-unit tracking', () => {
  it('derives completion from leaves, reopens consistently, and retains each watch event', async () => {
    const application = new ArchiveApplication(new MemoryArchivePersistence());
    const created = await application.createItem(
      await application.load(),
      seriesInput,
    );

    expect(created.items[0]).toMatchObject({
      status: 'planned',
      progress: { current: 0, target: 2, unit: 'subunits' },
    });
    expect(created.items[0].subunits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'season-1',
          description: 'The first season.',
          imageUrl: 'https://example.test/season-1.jpg',
        }),
        expect.objectContaining({
          id: 's1e1',
          description: 'The first episode.',
          imageUrl: 'https://example.test/s1e1.jpg',
        }),
      ]),
    );

    const withFirstEpisode = await application.watchSubunit(
      created,
      'the-expanse',
      's1e1',
    );
    expect(withFirstEpisode.items[0]).toMatchObject({
      status: 'in_progress',
      progress: { current: 1, target: 2, unit: 'subunits' },
    });

    const completed = await application.watchSubunit(
      withFirstEpisode,
      'the-expanse',
      's1e2',
    );
    expect(completed.items[0]).toMatchObject({
      status: 'completed',
      progress: { current: 2, target: 2, unit: 'subunits' },
    });
    expect(completed.history.map((entry) => entry.action)).toEqual([
      'created',
      'watched',
      'watched',
      'completed',
    ]);

    const reopened = await application.reopenTrackedItem(
      completed,
      'the-expanse',
    );
    expect(reopened.items[0]).toMatchObject({
      status: 'in_progress',
      progress: { current: 0, target: 2, unit: 'subunits' },
    });
    expect(reopened.items[0].subunits).toMatchObject([
      { id: 'season-1', completed: false, watchCount: 0 },
      { id: 's1e1', completed: false, watchCount: 1 },
      { id: 's1e2', completed: false, watchCount: 1 },
    ]);

    const rewatched = await application.watchSubunit(
      reopened,
      'the-expanse',
      's1e1',
    );
    const watches = rewatched.history.filter(
      (entry) => entry.subunitId === 's1e1',
    );
    expect(watches).toMatchObject([
      { action: 'watched', subunitId: 's1e1' },
      { action: 'rewatched', subunitId: 's1e1' },
    ]);
    expect(watches[0].id).not.toBe(watches[1].id);
    expect(
      rewatched.items[0].subunits.find((unit) => unit.id === 's1e1'),
    ).toMatchObject({ completed: true, watchCount: 2 });
  });

  it('normalizes contradictory imported parent state from valid leaf state', () => {
    const archive = createEmptyArchive();
    archive.items.push(createItem(seriesInput));

    const normalized = parseArchiveSnapshot(archive);

    expect(normalized.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(normalized.items[0]).toMatchObject({
      status: 'planned',
      progress: { current: 0, target: 2, unit: 'subunits' },
    });
  });

  it('rejects malformed tracking hierarchies at the archive boundary', () => {
    const archive = createEmptyArchive();
    archive.items.push(
      createItem({
        ...seriesInput,
        subunits: [
          {
            id: 'episode-1',
            kind: 'episode',
            title: 'Episode 1',
            parentId: 'missing-season',
            completed: false,
            watchCount: 0,
          },
        ],
      }),
    );

    expect(() => parseArchiveSnapshot(archive)).toThrow(
      'references a missing parent',
    );
  });
});
