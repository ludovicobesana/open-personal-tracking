import {
  createEmptyArchive,
  createItem,
  parseArchiveSnapshot,
  type ArchiveSnapshot,
  type CreateItemInput,
  type Item,
  type Progress,
  type UserPreferences,
} from '../domain/archive.js';
import { createHistoryEntry } from '../domain/search.js';

export interface ArchivePersistence {
  load(): Promise<ArchiveSnapshot | null>;
  save(snapshot: ArchiveSnapshot): Promise<void>;
  clear(): Promise<void>;
}

export type ItemUpdate = Partial<Pick<Item, 'category' | 'description' | 'externalIds' | 'imageUrl' | 'notes' | 'progress' | 'rating' | 'status' | 'tags' | 'title' | 'type' | 'attributes' | 'collections'>>;

const withHistory = (
  archive: ArchiveSnapshot,
  itemId: string,
  action: 'created' | 'updated' | 'completed' | 'deleted',
  summary: string,
): ArchiveSnapshot => ({
  ...archive,
  history: [...archive.history, createHistoryEntry({ itemId, action, summary })],
});

const updateTimestamp = (archive: ArchiveSnapshot): ArchiveSnapshot => ({
  ...archive,
  exportedAt: new Date().toISOString(),
});

const syncCollectionReferences = (archive: ArchiveSnapshot, nextItem: Item): ArchiveSnapshot => {
  const now = new Date().toISOString();
  const collectionIds = new Set(nextItem.collections);
  const knownIds = new Set(archive.collections.map((collection) => collection.id));
  const existing = archive.collections.map((collection) => {
    const hadItem = collection.itemIds.includes(nextItem.id);
    const shouldContainItem = collectionIds.has(collection.id);
    if (hadItem === shouldContainItem) return collection;

    return {
      ...collection,
      itemIds: shouldContainItem
        ? [...collection.itemIds, nextItem.id]
        : collection.itemIds.filter((id) => id !== nextItem.id),
      updatedAt: now,
    };
  });
  const missing = nextItem.collections
    .filter((id) => !knownIds.has(id))
    .map((id) => ({ id, name: id, itemIds: [nextItem.id], createdAt: now, updatedAt: now }));

  return { ...archive, collections: [...existing, ...missing] };
};

/** Coordinates archive use cases without exposing storage details to the UI. */
export class ArchiveApplication {
  constructor(private readonly persistence: ArchivePersistence) {}

  async load(): Promise<ArchiveSnapshot> {
    return (await this.persistence.load()) ?? createEmptyArchive();
  }

  async createItem(archive: ArchiveSnapshot, input: CreateItemInput): Promise<ArchiveSnapshot> {
    const item = createItem(input);
    const next = withHistory(
      syncCollectionReferences({ ...archive, items: [...archive.items, item] }, item),
      item.id,
      'created',
      `Added ${item.title}`,
    );

    return this.persist(next);
  }

  async updateItem(archive: ArchiveSnapshot, itemId: string, update: ItemUpdate): Promise<ArchiveSnapshot> {
    const current = archive.items.find((item) => item.id === itemId);
    if (!current) {
      throw new Error(`Cannot update missing item: ${itemId}`);
    }

    const updated = createItem({
      ...current,
      ...update,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    });
    const action = updated.status === 'completed' && current.status !== 'completed' ? 'completed' : 'updated';
    const next = withHistory(
      syncCollectionReferences({ ...archive, items: archive.items.map((item) => item.id === itemId ? updated : item) }, updated),
      itemId,
      action,
      action === 'completed' ? `Completed ${updated.title}` : `Updated ${updated.title}`,
    );

    return this.persist(next);
  }

  async updateProgress(archive: ArchiveSnapshot, itemId: string, progress: Progress): Promise<ArchiveSnapshot> {
    return this.updateItem(archive, itemId, { progress });
  }

  async updatePreferences(archive: ArchiveSnapshot, preferences: UserPreferences): Promise<ArchiveSnapshot> {
    return this.persist({ ...archive, preferences });
  }

  async deleteItem(archive: ArchiveSnapshot, itemId: string): Promise<ArchiveSnapshot> {
    const item = archive.items.find((entry) => entry.id === itemId);
    if (!item) {
      throw new Error(`Cannot delete missing item: ${itemId}`);
    }

    const next = withHistory(
      {
        ...archive,
        items: archive.items.filter((entry) => entry.id !== itemId),
        collections: archive.collections.map((collection) => ({
          ...collection,
          itemIds: collection.itemIds.filter((id) => id !== itemId),
        })),
      },
      itemId,
      'deleted',
      `Deleted ${item.title}`,
    );

    return this.persist(next);
  }

  private async persist(archive: ArchiveSnapshot): Promise<ArchiveSnapshot> {
    const normalized = parseArchiveSnapshot(updateTimestamp(archive));
    await this.persistence.save(normalized);
    return normalized;
  }
}
