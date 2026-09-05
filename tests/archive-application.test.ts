import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArchiveApplication } from '../src/application/archive-application.js';
import { loadLocalArchive } from '../src/application/local-archive-application.js';
import { createEmptyArchive, type ArchiveSnapshot } from '../src/domain/archive.js';

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

describe('archive application', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates, updates, and reloads items through the persistence boundary', async () => {
    const persistence = new MemoryArchivePersistence();
    const application = new ArchiveApplication(persistence);

    const created = await application.createItem(await application.load(), {
      id: 'dune',
      title: 'Dune',
      category: 'Book',
      progress: { current: 0, target: 688, unit: 'pages' },
      notes: ['Read before the film', 'Revisit the appendix'],
      tags: ['science fiction'],
    });
    const edited = await application.updateItem(created, 'dune', {
      rating: 5,
      notes: ['Read before the film', 'Revisit the appendix'],
      tags: ['science fiction', 'favourite'],
      collections: ['favorites'],
    });
    const updated = await application.updateProgress(edited, 'dune', { current: 184, target: 688, unit: 'pages' });

    expect((await application.load()).items[0]).toMatchObject({
      title: 'Dune',
      progress: { current: 184, target: 688, unit: 'pages' },
      notes: ['Read before the film', 'Revisit the appendix'],
      tags: ['science fiction', 'favourite'],
      rating: 5,
    });
    expect(updated.collections[0]).toMatchObject({ id: 'favorites', itemIds: ['dune'] });
    expect(updated.history.map((entry) => entry.action)).toEqual(['created', 'updated', 'updated']);
  });

  it('persists preferences and removes item references when deleting an item', async () => {
    const persistence = new MemoryArchivePersistence();
    const application = new ArchiveApplication(persistence);
    const archive = createEmptyArchive();
    archive.exportedAt = '2020-01-01T00:00:00.000Z';
    archive.collections.push({
      id: 'favorites', name: 'Favorites', itemIds: ['dune'], createdAt: archive.exportedAt, updatedAt: archive.exportedAt,
    });
    const withItem = await application.createItem(archive, {
      id: 'dune', title: 'Dune', category: 'Book', progress: { current: 0, unit: 'pages' }, collections: ['favorites'],
    });
    const withPreferences = await application.updatePreferences(withItem, {
      displayName: 'Ludovico', locale: 'it', activities: ['books'], favoriteGenres: ['Sci-fi'], placeholderCovers: false, onboardingCompleted: true,
    });
    const deleted = await application.deleteItem(withPreferences, 'dune');

    expect(withItem.collections[0].itemIds).toEqual(['dune']);
    expect(deleted.items).toEqual([]);
    expect(deleted.collections[0].itemIds).toEqual([]);
    expect(deleted.collections[0].updatedAt).not.toBe(withPreferences.collections[0].updatedAt);
    expect(deleted.preferences.displayName).toBe('Ludovico');
    expect(deleted.history.at(-1)?.action).toBe('deleted');
  });

  it('moves legacy onboarding preferences into the archive once', async () => {
    const values = new Map<string, string>([[
      'open-personal-tracking.preferences.v1',
      JSON.stringify({ displayName: 'Ludovico', locale: 'it', activities: ['books'], favoriteGenres: ['Sci-fi'], onboardingCompleted: true }),
    ]]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    });
    const persistence = new MemoryArchivePersistence();
    const application = new ArchiveApplication(persistence);

    const archive = await loadLocalArchive(application);

    expect(archive.preferences).toMatchObject({ displayName: 'Ludovico', locale: 'it', onboardingCompleted: true });
    expect(values.has('open-personal-tracking.preferences.v1')).toBe(false);
    expect(persistence.snapshot?.preferences.displayName).toBe('Ludovico');
  });

  it('keeps legacy preferences when their archive migration cannot be saved', async () => {
    const key = 'open-personal-tracking.preferences.v1';
    const values = new Map<string, string>([[key, JSON.stringify({ displayName: 'Ludovico', onboardingCompleted: true })]]);
    vi.stubGlobal('localStorage', {
      getItem: (storageKey: string) => values.get(storageKey) ?? null,
      removeItem: (storageKey: string) => values.delete(storageKey),
    });
    const persistence = new MemoryArchivePersistence();
    persistence.save = async () => { throw new Error('Storage is unavailable'); };

    await expect(loadLocalArchive(new ArchiveApplication(persistence))).rejects.toThrow('Storage is unavailable');
    expect(values.has(key)).toBe(true);
  });
});
